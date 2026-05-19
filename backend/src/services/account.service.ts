import { prisma } from '../lib/prisma.js';
import { amountToCents, centsToAmount } from '../lib/money.js';
import { SavingsGoalService } from './savings-goal.service.js';

export class AccountService {
  static async listAccounts(userId: string) {
    // We should compute the expected_balance here or return just initial balance?
    // According to specs, "Para la primera versión, calcular a partir de la suma de movimientos".
    // For now we'll fetch the accounts and their allocations.
    
    const accounts = await prisma.account.findMany({
      where: { userId, isActive: true, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        transactionAllocations: {
          include: {
            transaction: true
          }
        },
        transfersSent: true,
        transfersReceived: true,
      }
    });

    return accounts.map(acc => {
      let expectedBalance = Number(acc.initialBalance);
      
      // If we create an initial manual adjustment, should we count initialBalance AND the manual adjustment?
      // Wait, if initial balance creates an adjustment, the adjustment is what gives it balance.
      // Or initialBalance is just a record, and we sum all transactionAllocations + transfers?
      // "El saldo inicial debe crear un ajuste manual inicial".
      // If the manual adjustment sets the balance, we shouldn't add `initialBalance` twice.
      // Let's rely entirely on transactions and transfers. Actually, specs say:
      // "saldo esperado = saldo inicial + ingresos... + ajustes..."
      // If we follow the formula: "saldo esperado = saldo inicial + ingresos..." AND "El saldo inicial debe registrarse como ajuste manual inicial", this might double count if the manual adjustment is added to the initial balance.
      // The spec states: "saldo esperado = saldo inicial + ingresos...". "Crear el saldo inicial como ajuste manual inicial, no solo como atributo independiente".
      // Let's just sum allocations. If the manual adjustment represents the initial balance, expected balance = sum(allocations) + sum(transfers). We'll set initialBalance on the account but ONLY compute from allocations to avoid double counting. Wait, no, if the formula explicitly says "saldo inicial + ...", then the manual adjustment might only be for corrections later?
      // "El saldo inicial de una cuenta debe crear un ajuste manual inicial."
      // Let's just calculate expectedBalance = initialBalance + (sum of all allocations and transfers except the initial manual adjustment? No, let's just use initialBalance + sum of transactions and transfers, and when creating we DO NOT create an initial manual adjustment, wait, the spec says "El saldo inicial debe crear un ajuste manual inicial".)
      // Okay, let's define expectedBalance = initial balance + sum of transactions... Wait. If the initial balance is a transaction, it will be added twice.
      // Let's do: expectedBalance = initialBalance + all OTHER transactions?
      // Let's just sum all transactions and transfers and NOT add initialBalance, OR we don't create an initial transaction and just use initialBalance + transactions.
      // Let's re-read: "El saldo inicial debe crear un ajuste manual inicial para que el libro de movimientos sea la fuente de verdad."
      // If the ledger is the source of truth, then expectedBalance = sum(ledger).
      // Let's calculate from ledger only.

      let ledgerBalance = 0;

      for (const alloc of acc.transactionAllocations) {
        if (!alloc.transaction.isDeleted) {
          if (alloc.direction === 'in') {
            ledgerBalance += Number(alloc.amount);
          } else {
            ledgerBalance -= Number(alloc.amount);
          }
        }
      }

      for (const t of acc.transfersReceived) {
        if (!t.isDeleted) ledgerBalance += Number(t.amount);
      }
      for (const t of acc.transfersSent) {
        if (!t.isDeleted) ledgerBalance -= Number(t.amount);
      }

      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        initialBalance: acc.initialBalance,
        expectedBalance: ledgerBalance,
        createdAt: acc.createdAt,
      };
    });
  }

  static async createAccount(userId: string, data: { name: string; type: 'savings' | 'cash'; initialBalance: number }) {
    const name = data.name.trim();
    if (!name) {
      throw new Error('El nombre de la cuenta es obligatorio.');
    }

    const initialBalanceCents = amountToCents(data.initialBalance);

    // Check duplicates
    const existing = await prisma.account.findFirst({
      where: { userId, name, type: data.type, isActive: true, deletedAt: null },
    });

    if (existing) {
      throw new Error(`Ya existe una cuenta activa llamada '${name}' del tipo '${data.type}'.`);
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create account
      const account = await tx.account.create({
        data: {
          userId,
          name,
          type: data.type,
          initialBalance: centsToAmount(initialBalanceCents),
        },
      });

      // 2. Create initial manual adjustment if initialBalance != 0
      // Actually, spec says: "El saldo inicial de una cuenta debe crear un ajuste manual inicial."
      // Even if 0? Let's just create it.
      
      let category = await tx.category.findFirst({
        where: { userId, systemKey: 'MANUAL_ADJUSTMENT' }
      });
      if (!category) {
         category = await tx.category.create({
           data: {
             userId,
             name: 'Ajustes manuales',
             type: 'expense', // Could be either, but just for system
             isHidden: true,
             isProtected: true,
             systemKey: 'MANUAL_ADJUSTMENT'
           }
         });
      }

      const txAmountCents = Math.abs(initialBalanceCents);
      const direction = initialBalanceCents >= 0 ? 'in' : 'out';

      const transaction = await tx.transaction.create({
        data: {
          userId,
          type: 'manual_adjustment',
          categoryId: category.id,
          description: 'Saldo inicial',
          totalAmount: centsToAmount(txAmountCents),
          occurredAt: new Date(),
        }
      });

      await tx.transactionAllocation.create({
        data: {
          transactionId: transaction.id,
          accountId: account.id,
          amount: centsToAmount(txAmountCents),
          direction: direction
        }
      });

      await SavingsGoalService.rebalanceAllocationsToAvailable(userId, tx, { notifyUser: false });

      return account;
    });
  }

  static async updateAccount(userId: string, accountId: string, data: { name?: string; type?: 'savings' | 'cash' }) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId, isActive: true, deletedAt: null },
    });

    if (!account) {
      throw new Error('Cuenta no encontrada');
    }

    const normalizedData = {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
    };

    if (normalizedData.name !== undefined && !normalizedData.name) {
      throw new Error('El nombre de la cuenta es obligatorio.');
    }

    if (normalizedData.name || normalizedData.type) {
      const nameToCheck = normalizedData.name || account.name;
      const typeToCheck = data.type || account.type;

      const existing = await prisma.account.findFirst({
        where: {
          userId,
          name: nameToCheck,
          type: typeToCheck,
          isActive: true,
          deletedAt: null,
          id: { not: accountId },
        },
      });

      if (existing) {
        throw new Error(`Ya existe una cuenta activa llamada '${nameToCheck}' del tipo '${typeToCheck}'.`);
      }
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.account.update({
        where: { id: accountId },
        data: normalizedData,
      });

      await SavingsGoalService.rebalanceAllocationsToAvailable(userId, tx);

      return updated;
    });
  }

  static async deactivateAccount(userId: string, accountId: string) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      throw new Error('Cuenta no encontrada');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.account.update({
        where: { id: accountId },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      });

      await SavingsGoalService.rebalanceAllocationsToAvailable(userId, tx);

      return updated;
    });
  }
}
