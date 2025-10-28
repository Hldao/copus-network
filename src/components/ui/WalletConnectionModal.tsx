import React, { useState } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { useWallet } from '../../hooks/useWallet';
import { useUser } from '../../contexts/UserContext';

// 钱包选项配置
const WALLET_OPTIONS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    description: '连接到你的MetaMask钱包'
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '🛡️',
    description: '使用Coinbase钱包'
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '🔗',
    description: '使用WalletConnect协议连接'
  }
];

export interface WalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { connectWallet, isLoading, error } = useWallet();
  const { user, isLoggedIn } = useUser();
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);

  if (!isOpen) return null;

  // 检查钱包是否安装
  const checkWalletInstalled = (walletType: string): boolean => {
    if (typeof window === 'undefined') return false;

    switch (walletType) {
      case 'metamask':
        return !!window.ethereum && !!window.ethereum.isMetaMask;
      case 'coinbase':
        return !!window.ethereum && !!window.ethereum.isCoinbaseWallet;
      case 'walletconnect':
        return true; // WalletConnect 不需要安装
      default:
        return false;
    }
  };

  // 获取钱包安装链接
  const getWalletInstallUrl = (walletType: string): string => {
    switch (walletType) {
      case 'metamask':
        return 'https://metamask.io/download/';
      case 'coinbase':
        return 'https://www.coinbase.com/wallet';
      case 'walletconnect':
        return 'https://walletconnect.com/';
      default:
        return '#';
    }
  };

  // 处理钱包连接
  const handleWalletSelect = async (walletId: string) => {
    setSelectedWallet(walletId);
    const account = await connectWallet(walletId);

    if (account) {
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white">
        <CardContent className="p-6">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              连接钱包
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* 加载状态 */}
          {isLoading && selectedWallet && (
            <div className="text-center space-y-4 mb-6">
              <div className="w-16 h-16 mx-auto">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">连接钱包中...</h3>
              <p className="text-gray-600">
                正在连接到 {WALLET_OPTIONS.find(w => w.id === selectedWallet)?.name}
              </p>

              {/* 连接步骤指示 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-blue-800">1. 确认连接请求</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-sm text-gray-600">2. 签名验证身份</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-sm text-gray-600">3. 自动登录/注册账户</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-sm text-gray-600">4. 完成连接</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-sm">
                  🔐 需要签名验证您的钱包所有权并自动登录/注册账户（免费操作）
                </p>
              </div>
            </div>
          )}

          {/* 钱包选项 */}
          {!isLoading && (
            <div className="space-y-6">
              <div>
                <p className="text-gray-600 text-sm mb-4">选择你要使用的钱包来连接</p>
              </div>

              <div className="space-y-3">
                {WALLET_OPTIONS.map((wallet) => {
                  const isInstalled = checkWalletInstalled(wallet.id);
                  return (
                    <button
                      key={wallet.id}
                      onClick={() => handleWalletSelect(wallet.id)}
                      disabled={!isInstalled}
                      className={`w-full p-4 border-2 rounded-lg transition-all duration-200 text-left ${
                        isInstalled
                          ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          : 'border-gray-100 bg-gray-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{wallet.icon}</span>
                        <div className="flex-1">
                          <div className={`font-medium ${isInstalled ? 'text-gray-900' : 'text-gray-500'}`}>
                            {wallet.name}
                          </div>
                          <div className={`text-sm ${isInstalled ? 'text-gray-600' : 'text-gray-400'}`}>
                            {isInstalled ? wallet.description : '钱包未安装'}
                          </div>
                        </div>
                        {!isInstalled && (
                          <a
                            href={getWalletInstallUrl(wallet.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 text-sm hover:text-blue-700 underline"
                          >
                            安装
                          </a>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 信息提示 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-blue-600">ℹ️</span>
                  <span className="font-medium text-blue-800">使用提示</span>
                </div>
                <div className="text-blue-700 text-sm space-y-1">
                  <p>• 连接钱包后可以进行匿名支付</p>
                  <p>• 自动登录/注册 Copus 账户，永久保存购买记录</p>
                  <p>• 支持多个区块链网络（以太坊、Polygon等）</p>
                  <p>• 您的私钥始终安全地保存在钱包中</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};