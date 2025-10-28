import React, { useState, useEffect } from 'react';
import { Badge } from './badge';
import { realPaymentService } from '../../services/realPaymentService';

export interface TransactionMonitorProps {
  transactionHash: string;
  onConfirmed: () => void;
  onFailed: () => void;
  className?: string;
}

export const TransactionMonitor: React.FC<TransactionMonitorProps> = ({
  transactionHash,
  onConfirmed,
  onFailed,
  className = ''
}) => {
  const [status, setStatus] = useState<{
    status: 'pending' | 'confirmed' | 'failed';
    confirmations: number;
    requiredConfirmations: number;
    blockNumber?: number;
  }>({
    status: 'pending',
    confirmations: 0,
    requiredConfirmations: 3,
  });

  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkTransactionStatus = async () => {
      try {
        const txStatus = await realPaymentService.getTransactionStatus(transactionHash);

        if (txStatus) {
          setStatus(txStatus);
          setLastChecked(new Date());

          // 检查是否已确认
          if (txStatus.status === 'confirmed') {
            onConfirmed();
            clearInterval(intervalId);
          } else if (txStatus.status === 'failed') {
            onFailed();
            clearInterval(intervalId);
          }
        }
      } catch (error) {
        console.error('检查交易状态失败:', error);
      }
    };

    // 立即检查一次
    checkTransactionStatus();

    // 每10秒检查一次
    intervalId = setInterval(checkTransactionStatus, 10000);

    // 组件卸载时清理定时器
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [transactionHash, onConfirmed, onFailed]);

  // 获取状态显示信息
  const getStatusInfo = () => {
    switch (status.status) {
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '⏳',
          text: '等待确认',
        };
      case 'confirmed':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '✅',
          text: '已确认',
        };
      case 'failed':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '❌',
          text: '失败',
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '❓',
          text: '未知',
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`bg-white border rounded-lg p-4 space-y-3 ${className}`}>
      {/* 交易哈希 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">交易哈希</span>
        <a
          href={`https://etherscan.io/tx/${transactionHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs text-blue-600 hover:text-blue-700 underline"
        >
          {transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}
        </a>
      </div>

      {/* 状态显示 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">状态</span>
        <Badge
          variant="outline"
          className={`${statusInfo.color} border`}
        >
          <span className="mr-1">{statusInfo.icon}</span>
          {statusInfo.text}
        </Badge>
      </div>

      {/* 确认数 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">确认数</span>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-900">
            {status.confirmations} / {status.requiredConfirmations}
          </span>
          {status.status === 'pending' && (
            <div className="w-4 h-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </div>

      {/* 进度条 */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-500">
          <span>确认进度</span>
          <span>{Math.min(100, (status.confirmations / status.requiredConfirmations) * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              status.status === 'confirmed' ? 'bg-green-500' :
              status.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{
              width: `${Math.min(100, (status.confirmations / status.requiredConfirmations) * 100)}%`
            }}
          />
        </div>
      </div>

      {/* 区块信息 */}
      {status.blockNumber && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>区块号</span>
          <span>#{status.blockNumber}</span>
        </div>
      )}

      {/* 最后检查时间 */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>最后检查</span>
        <span>{lastChecked.toLocaleTimeString()}</span>
      </div>

      {/* 状态说明 */}
      <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
        {status.status === 'pending' && (
          <p>⏱️ 交易正在等待矿工确认，通常需要1-5分钟</p>
        )}
        {status.status === 'confirmed' && (
          <p>🎉 交易已成功确认，内容已解锁</p>
        )}
        {status.status === 'failed' && (
          <p>💔 交易失败，请检查网络状态或重试支付</p>
        )}
      </div>
    </div>
  );
};