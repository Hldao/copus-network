// 匿名用户解锁状态管理 - 多层持久化方案
export interface AnonymousUnlockRecord {
  contentId: string;
  transactionHash: string;
  walletAddress: string;
  price: string;
  currency: string;
  network: string;
  unlockedAt: number;
  blockNumber?: number;
}

export interface WalletUnlockSummary {
  walletAddress: string;
  totalUnlocks: number;
  totalSpent: { [currency: string]: string };
  lastActive: number;
  unlockedContentIds: string[];
}

class AnonymousUnlockService {
  private static instance: AnonymousUnlockService;
  private readonly STORAGE_PREFIX = 'x402_anonymous_';

  private constructor() {}

  public static getInstance(): AnonymousUnlockService {
    if (!AnonymousUnlockService.instance) {
      AnonymousUnlockService.instance = new AnonymousUnlockService();
    }
    return AnonymousUnlockService.instance;
  }

  // 方案1：基于localStorage的本地持久化（现有）
  saveLocalUnlock(record: AnonymousUnlockRecord): void {
    try {
      // 保存单个内容的解锁状态
      localStorage.setItem(`${this.STORAGE_PREFIX}${record.contentId}`, 'true');

      // 保存详细记录
      localStorage.setItem(
        `${this.STORAGE_PREFIX}${record.contentId}_details`,
        JSON.stringify(record)
      );

      // 维护匿名用户的解锁列表
      this.addToLocalUnlockHistory(record);

    } catch (error) {
      console.warn('保存本地解锁状态失败:', error);
    }
  }

  // 方案2：基于钱包地址的跨设备验证
  async verifyUnlockByWallet(contentId: string, walletAddress: string): Promise<boolean> {
    try {
      // 从后端API查询该钱包地址是否已支付此内容
      const response = await fetch(`/api/v1/anonymous/verify-unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          walletAddress,
          timestamp: Date.now()
        })
      });

      const result = await response.json();

      if (result.success && result.data.isUnlocked) {
        // 在本地设备上激活解锁状态
        this.saveLocalUnlock(result.data.unlockRecord);
        return true;
      }

      return false;
    } catch (error) {
      console.warn('钱包验证失败:', error);
      return false;
    }
  }

  // 方案3：基于交易哈希的手动恢复
  async restoreUnlockByTransaction(
    contentId: string,
    transactionHash: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 验证交易哈希的有效性
      const response = await fetch(`/api/v1/anonymous/restore-unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          transactionHash
        })
      });

      const result = await response.json();

      if (result.success) {
        // 恢复解锁状态到本地
        this.saveLocalUnlock(result.data.unlockRecord);

        return {
          success: true,
          message: '解锁状态已成功恢复！'
        };
      }

      return {
        success: false,
        message: result.message || '交易验证失败'
      };

    } catch (error) {
      return {
        success: false,
        message: '网络错误，请稍后重试'
      };
    }
  }

  // 检查内容是否已解锁（综合检查）
  async isContentUnlocked(contentId: string, walletAddress?: string): Promise<boolean> {
    // 首先检查本地存储
    const localUnlocked = this.checkLocalUnlock(contentId);
    if (localUnlocked) {
      return true;
    }

    // 如果有钱包地址，尝试钱包验证
    if (walletAddress) {
      const walletVerified = await this.verifyUnlockByWallet(contentId, walletAddress);
      if (walletVerified) {
        return true;
      }
    }

    return false;
  }

  // 检查本地解锁状态
  private checkLocalUnlock(contentId: string): boolean {
    try {
      return localStorage.getItem(`${this.STORAGE_PREFIX}${contentId}`) === 'true';
    } catch (error) {
      return false;
    }
  }

  // 获取本地解锁历史
  getLocalUnlockHistory(): AnonymousUnlockRecord[] {
    try {
      const historyJson = localStorage.getItem(`${this.STORAGE_PREFIX}history`);
      return historyJson ? JSON.parse(historyJson) : [];
    } catch (error) {
      return [];
    }
  }

  // 添加到本地历史记录
  private addToLocalUnlockHistory(record: AnonymousUnlockRecord): void {
    try {
      const history = this.getLocalUnlockHistory();

      // 检查是否已存在，避免重复
      const existingIndex = history.findIndex(h => h.contentId === record.contentId);

      if (existingIndex >= 0) {
        history[existingIndex] = record;
      } else {
        history.push(record);
      }

      // 按时间倒序排列
      history.sort((a, b) => b.unlockedAt - a.unlockedAt);

      localStorage.setItem(`${this.STORAGE_PREFIX}history`, JSON.stringify(history));
    } catch (error) {
      console.warn('保存历史记录失败:', error);
    }
  }

  // 清理过期的本地记录（可选）
  cleanupExpiredRecords(daysOld: number = 90): void {
    try {
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      const history = this.getLocalUnlockHistory();

      const validHistory = history.filter(record => record.unlockedAt > cutoffTime);

      localStorage.setItem(`${this.STORAGE_PREFIX}history`, JSON.stringify(validHistory));
    } catch (error) {
      console.warn('清理过期记录失败:', error);
    }
  }

  // 导出用户数据（方便用户备份）
  exportUserData(): string {
    const history = this.getLocalUnlockHistory();
    const exportData = {
      version: '1.0',
      exportedAt: Date.now(),
      records: history
    };

    return JSON.stringify(exportData, null, 2);
  }

  // 导入用户数据（从备份恢复）
  importUserData(jsonData: string): { success: boolean; imported: number; message: string } {
    try {
      const importData = JSON.parse(jsonData);

      if (!importData.records || !Array.isArray(importData.records)) {
        return {
          success: false,
          imported: 0,
          message: '数据格式无效'
        };
      }

      let importedCount = 0;

      importData.records.forEach((record: AnonymousUnlockRecord) => {
        if (this.validateUnlockRecord(record)) {
          this.saveLocalUnlock(record);
          importedCount++;
        }
      });

      return {
        success: true,
        imported: importedCount,
        message: `成功导入 ${importedCount} 条解锁记录`
      };

    } catch (error) {
      return {
        success: false,
        imported: 0,
        message: '导入失败：数据格式错误'
      };
    }
  }

  // 验证解锁记录的有效性
  private validateUnlockRecord(record: any): record is AnonymousUnlockRecord {
    return record &&
           typeof record.contentId === 'string' &&
           typeof record.transactionHash === 'string' &&
           typeof record.walletAddress === 'string' &&
           typeof record.unlockedAt === 'number';
  }
}

export const anonymousUnlockService = AnonymousUnlockService.getInstance();