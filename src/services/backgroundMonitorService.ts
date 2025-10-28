import { realPaymentService } from './realPaymentService';
import { anonymousUnlockService } from './anonymousUnlockService';

interface PendingTransaction {
  contentId: string;
  transactionHash: string;
  walletAddress: string;
  price: string;
  currency: string;
  network: string;
  unlockedAt: number;
  checkCount: number;
  maxChecks: number;
}

class BackgroundMonitorService {
  private isMonitoring = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs = 30000; // 30秒检查一次
  private readonly maxChecks = 40; // 最多检查40次(20分钟)

  // 启动后台监控
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitorInterval = setInterval(() => {
      this.checkPendingTransactions();
    }, this.checkIntervalMs);

    console.log('🔍 后台交易监控服务已启动');
  }

  // 停止后台监控
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isMonitoring = false;
    console.log('⏹️ 后台交易监控服务已停止');
  }

  // 添加待监控的交易
  addPendingTransaction(transaction: Omit<PendingTransaction, 'checkCount' | 'maxChecks'>): void {
    const pendingTx: PendingTransaction = {
      ...transaction,
      checkCount: 0,
      maxChecks: this.maxChecks,
    };

    localStorage.setItem(
      `pending_unlock_${transaction.contentId}`,
      JSON.stringify(pendingTx)
    );

    // 如果监控服务未启动，则启动它
    if (!this.isMonitoring) {
      this.startMonitoring();
    }

    console.log(`➕ 添加待监控交易: ${transaction.transactionHash}`);
  }

  // 检查所有待处理的交易
  private async checkPendingTransactions(): Promise<void> {
    const pendingKeys = this.getPendingTransactionKeys();

    if (pendingKeys.length === 0) {
      // 没有待处理交易，停止监控
      this.stopMonitoring();
      return;
    }

    console.log(`🔍 检查 ${pendingKeys.length} 个待处理交易...`);

    for (const key of pendingKeys) {
      try {
        const pendingData = localStorage.getItem(key);
        if (!pendingData) continue;

        const transaction: PendingTransaction = JSON.parse(pendingData);
        transaction.checkCount++;

        // 检查交易状态
        const status = await realPaymentService.getTransactionStatus(transaction.transactionHash);

        if (status) {
          if (status.status === 'confirmed') {
            // 交易确认成功
            await this.handleTransactionConfirmed(transaction);
            localStorage.removeItem(key);
            this.showNotification('支付确认成功', `内容 "${transaction.contentId}" 已解锁`);
          } else if (status.status === 'failed') {
            // 交易失败
            localStorage.removeItem(key);
            this.showNotification('支付失败', `交易 ${transaction.transactionHash.slice(0, 10)}... 失败`);
          } else if (transaction.checkCount >= transaction.maxChecks) {
            // 超时，停止监控
            localStorage.removeItem(key);
            this.showNotification('支付监控超时', '请手动检查交易状态');
          } else {
            // 继续监控，更新检查次数
            localStorage.setItem(key, JSON.stringify(transaction));
          }
        } else if (transaction.checkCount >= transaction.maxChecks) {
          // 无法获取状态且已超时
          localStorage.removeItem(key);
          this.showNotification('网络错误', '无法获取交易状态，请检查网络连接');
        } else {
          // 继续监控
          localStorage.setItem(key, JSON.stringify(transaction));
        }
      } catch (error) {
        console.error('检查交易状态失败:', error);
      }
    }
  }

  // 处理交易确认成功
  private async handleTransactionConfirmed(transaction: PendingTransaction): Promise<void> {
    try {
      // 通知后端支付完成
      await realPaymentService.notifyPaymentComplete({
        contentId: transaction.contentId,
        transactionHash: transaction.transactionHash,
        userIdentifier: `recovered_${transaction.walletAddress}`,
        amount: transaction.price,
        currency: transaction.currency,
        network: transaction.network,
      });

      // 保存到本地存储
      const unlockRecord = {
        contentId: transaction.contentId,
        transactionHash: transaction.transactionHash,
        walletAddress: transaction.walletAddress,
        price: transaction.price,
        currency: transaction.currency,
        network: transaction.network,
        unlockedAt: Date.now(), // 使用确认时间而不是提交时间
      };

      anonymousUnlockService.saveLocalUnlock(unlockRecord);
      console.log(`✅ 交易确认成功: ${transaction.transactionHash}`);

      // 触发页面刷新以更新UI状态
      this.notifyPageUpdate(transaction.contentId);
    } catch (error) {
      console.error('处理交易确认失败:', error);
    }
  }

  // 获取所有待处理交易的键
  private getPendingTransactionKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('pending_unlock_')) {
        keys.push(key);
      }
    }
    return keys;
  }

  // 显示浏览器通知
  private showNotification(title: string, body: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'payment-status', // 避免重复通知
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      // 请求通知权限
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: 'payment-status',
          });
        }
      });
    }
  }

  // 通知页面更新
  private notifyPageUpdate(contentId: string): void {
    // 发送自定义事件通知页面更新
    const event = new CustomEvent('unlockStateChanged', {
      detail: { contentId }
    });
    window.dispatchEvent(event);
  }

  // 获取待处理交易列表（用于调试和UI显示）
  getPendingTransactions(): PendingTransaction[] {
    const transactions: PendingTransaction[] = [];
    const keys = this.getPendingTransactionKeys();

    keys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          transactions.push(JSON.parse(data));
        } catch (error) {
          console.error('解析待处理交易数据失败:', error);
        }
      }
    });

    return transactions;
  }

  // 手动检查特定交易
  async checkSpecificTransaction(contentId: string): Promise<boolean> {
    const key = `pending_unlock_${contentId}`;
    const data = localStorage.getItem(key);

    if (!data) {
      return false;
    }

    try {
      const transaction: PendingTransaction = JSON.parse(data);
      const status = await realPaymentService.getTransactionStatus(transaction.transactionHash);

      if (status && status.status === 'confirmed') {
        await this.handleTransactionConfirmed(transaction);
        localStorage.removeItem(key);
        return true;
      }
    } catch (error) {
      console.error('检查特定交易失败:', error);
    }

    return false;
  }

  // 清理过期的待处理交易
  cleanupExpiredTransactions(): void {
    const keys = this.getPendingTransactionKeys();
    const expireTime = 24 * 60 * 60 * 1000; // 24小时

    keys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const transaction: PendingTransaction = JSON.parse(data);
          const age = Date.now() - transaction.unlockedAt;

          if (age > expireTime) {
            localStorage.removeItem(key);
            console.log(`🗑️ 清理过期交易: ${transaction.transactionHash}`);
          }
        } catch (error) {
          // 数据格式错误，直接删除
          localStorage.removeItem(key);
        }
      }
    });
  }

  // 初始化服务
  initialize(): void {
    // 清理过期交易
    this.cleanupExpiredTransactions();

    // 检查是否有待处理交易
    const pendingKeys = this.getPendingTransactionKeys();
    if (pendingKeys.length > 0) {
      this.startMonitoring();
    }

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && pendingKeys.length > 0) {
        // 页面重新可见时，立即检查一次
        this.checkPendingTransactions();
      }
    });

    console.log('🔧 后台监控服务已初始化');
  }
}

// 导出单例实例
export const backgroundMonitorService = new BackgroundMonitorService();