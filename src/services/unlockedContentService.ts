// 解锁内容状态管理服务
export interface UnlockedContent {
  contentId: string;
  unlockedAt: number;
  transactionHash: string;
  price: string;
  currency: string;
  network: string;
}

export interface UserUnlockRecord {
  userId: string;
  unlockedContents: UnlockedContent[];
}

class UnlockedContentService {
  private static instance: UnlockedContentService;
  private readonly STORAGE_KEY = 'x402_unlocked_contents';
  private readonly STORAGE_VERSION = '1.0';
  private userUnlockRecords: Map<string, UnlockedContent[]> = new Map();

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): UnlockedContentService {
    if (!UnlockedContentService.instance) {
      UnlockedContentService.instance = new UnlockedContentService();
    }
    return UnlockedContentService.instance;
  }

  // 检查内容是否已解锁
  isContentUnlocked(contentId: string, userId?: string): boolean {
    if (!userId) {
      // 匿名用户使用浏览器本地存储
      return this.isContentUnlockedAnonymous(contentId);
    }

    const userContents = this.userUnlockRecords.get(userId) || [];
    return userContents.some(content => content.contentId === contentId);
  }

  // 匿名用户解锁检查
  private isContentUnlockedAnonymous(contentId: string): boolean {
    try {
      const stored = localStorage.getItem(`unlocked_${contentId}`);
      return stored === 'true';
    } catch (error) {
      console.warn('无法读取匿名用户解锁状态:', error);
      return false;
    }
  }

  // 记录内容解锁
  unlockContent(
    contentId: string,
    transactionHash: string,
    price: string,
    currency: string,
    network: string,
    userId?: string
  ): void {
    const unlockRecord: UnlockedContent = {
      contentId,
      unlockedAt: Date.now(),
      transactionHash,
      price,
      currency,
      network
    };

    if (!userId) {
      // 匿名用户记录
      this.unlockContentAnonymous(contentId, unlockRecord);
      return;
    }

    // 登录用户记录
    const userContents = this.userUnlockRecords.get(userId) || [];

    // 检查是否已存在，避免重复记录
    const existingIndex = userContents.findIndex(content => content.contentId === contentId);
    if (existingIndex >= 0) {
      // 更新已有记录
      userContents[existingIndex] = unlockRecord;
    } else {
      // 添加新记录
      userContents.push(unlockRecord);
    }

    this.userUnlockRecords.set(userId, userContents);
    this.saveToStorage();
  }

  // 匿名用户解锁记录
  private unlockContentAnonymous(contentId: string, unlockRecord: UnlockedContent): void {
    try {
      localStorage.setItem(`unlocked_${contentId}`, 'true');
      localStorage.setItem(`unlocked_${contentId}_details`, JSON.stringify(unlockRecord));
    } catch (error) {
      console.warn('无法保存匿名用户解锁状态:', error);
    }
  }

  // 获取用户所有解锁内容
  getUserUnlockedContents(userId: string): UnlockedContent[] {
    return this.userUnlockRecords.get(userId) || [];
  }

  // 获取匿名用户解锁的内容
  getAnonymousUnlockedContents(): UnlockedContent[] {
    const unlockedContents: UnlockedContent[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('unlocked_') && key.endsWith('_details')) {
          const contentId = key.replace('unlocked_', '').replace('_details', '');
          const details = localStorage.getItem(key);
          if (details) {
            try {
              const unlockRecord = JSON.parse(details) as UnlockedContent;
              unlockedContents.push(unlockRecord);
            } catch (parseError) {
              console.warn(`无法解析解锁记录 ${contentId}:`, parseError);
            }
          }
        }
      }
    } catch (error) {
      console.warn('无法读取匿名用户解锁记录:', error);
    }

    return unlockedContents;
  }

  // 获取内容解锁详情
  getUnlockDetails(contentId: string, userId?: string): UnlockedContent | null {
    if (!userId) {
      return this.getAnonymousUnlockDetails(contentId);
    }

    const userContents = this.userUnlockRecords.get(userId) || [];
    return userContents.find(content => content.contentId === contentId) || null;
  }

  // 获取匿名用户解锁详情
  private getAnonymousUnlockDetails(contentId: string): UnlockedContent | null {
    try {
      const details = localStorage.getItem(`unlocked_${contentId}_details`);
      if (details) {
        return JSON.parse(details) as UnlockedContent;
      }
    } catch (error) {
      console.warn(`无法读取解锁详情 ${contentId}:`, error);
    }
    return null;
  }

  // 移除解锁记录（用于测试或重置）
  removeUnlockRecord(contentId: string, userId?: string): void {
    if (!userId) {
      // 匿名用户
      try {
        localStorage.removeItem(`unlocked_${contentId}`);
        localStorage.removeItem(`unlocked_${contentId}_details`);
      } catch (error) {
        console.warn('无法移除匿名用户解锁记录:', error);
      }
      return;
    }

    // 登录用户
    const userContents = this.userUnlockRecords.get(userId) || [];
    const updatedContents = userContents.filter(content => content.contentId !== contentId);
    this.userUnlockRecords.set(userId, updatedContents);
    this.saveToStorage();
  }

  // 清除所有解锁记录（用于演示重置）
  clearAllUnlockRecords(): void {
    this.userUnlockRecords.clear();
    this.clearAnonymousRecords();
    this.saveToStorage();
  }

  // 清除匿名用户记录
  private clearAnonymousRecords(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('unlocked_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('无法清除匿名用户解锁记录:', error);
    }
  }

  // 获取解锁统计信息
  getUnlockStats(userId?: string): {
    totalUnlocked: number;
    totalSpent: string;
    recentUnlocks: UnlockedContent[];
  } {
    const unlockedContents = userId
      ? this.getUserUnlockedContents(userId)
      : this.getAnonymousUnlockedContents();

    const totalUnlocked = unlockedContents.length;

    // 计算总消费（以USDC为基准）
    let totalSpentUSDC = 0;
    unlockedContents.forEach(content => {
      const amount = parseFloat(content.price);
      if (!isNaN(amount)) {
        // 简单换算，实际应该使用实时汇率
        if (content.currency === 'USDC' || content.currency === 'USDT') {
          totalSpentUSDC += amount;
        }
      }
    });

    // 最近解锁的内容（按时间排序，取最新5个）
    const recentUnlocks = unlockedContents
      .sort((a, b) => b.unlockedAt - a.unlockedAt)
      .slice(0, 5);

    return {
      totalUnlocked,
      totalSpent: totalSpentUSDC.toFixed(2),
      recentUnlocks
    };
  }

  // 保存到本地存储
  private saveToStorage(): void {
    try {
      const data = {
        version: this.STORAGE_VERSION,
        records: Array.from(this.userUnlockRecords.entries()).map(([userId, contents]) => ({
          userId,
          contents
        })),
        savedAt: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('无法保存解锁记录到本地存储:', error);
    }
  }

  // 从本地存储加载
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);

        // 检查版本兼容性
        if (data.version === this.STORAGE_VERSION && data.records) {
          data.records.forEach((record: { userId: string; contents: UnlockedContent[] }) => {
            this.userUnlockRecords.set(record.userId, record.contents);
          });
        }
      }
    } catch (error) {
      console.warn('无法从本地存储加载解锁记录:', error);
      this.userUnlockRecords.clear();
    }
  }

  // 导出解锁记录（用于备份）
  exportUnlockRecords(): string {
    const allRecords = {
      userRecords: Array.from(this.userUnlockRecords.entries()),
      anonymousRecords: this.getAnonymousUnlockedContents(),
      exportedAt: Date.now(),
      version: this.STORAGE_VERSION
    };
    return JSON.stringify(allRecords, null, 2);
  }

  // 导入解锁记录（用于恢复）
  importUnlockRecords(data: string): boolean {
    try {
      const records = JSON.parse(data);
      if (records.version === this.STORAGE_VERSION && records.userRecords) {
        this.userUnlockRecords.clear();
        records.userRecords.forEach(([userId, contents]: [string, UnlockedContent[]]) => {
          this.userUnlockRecords.set(userId, contents);
        });
        this.saveToStorage();
        return true;
      }
      return false;
    } catch (error) {
      console.warn('无法导入解锁记录:', error);
      return false;
    }
  }
}

// 导出单例实例
export const unlockedContentService = UnlockedContentService.getInstance();

// 导出类型
export default UnlockedContentService;