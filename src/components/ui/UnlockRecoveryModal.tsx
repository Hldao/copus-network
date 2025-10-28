import React, { useState } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Input } from './input';
import { useToast } from './toast';
import { anonymousUnlockService } from '../../services/anonymousUnlockService';
import { useWallet } from '../../hooks/useWallet';
import { WalletConnectionModal } from './WalletConnectionModal';

export interface UnlockRecoveryModalProps {
  isOpen: boolean;
  contentId: string;
  contentTitle: string;
  onClose: () => void;
  onRecoverySuccess: () => void;
}

type RecoveryMethod = 'wallet' | 'transaction' | 'import';

export const UnlockRecoveryModal: React.FC<UnlockRecoveryModalProps> = ({
  isOpen,
  contentId,
  contentTitle,
  onClose,
  onRecoverySuccess
}) => {
  const [activeMethod, setActiveMethod] = useState<RecoveryMethod>('wallet');
  const [loading, setLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const [importData, setImportData] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { showToast } = useToast();
  const { isConnected, account } = useWallet();

  if (!isOpen) return null;

  // 连接钱包并验证
  const handleWalletRecovery = async () => {
    if (!isConnected || !account) {
      setShowWalletModal(true);
      return;
    }

    setLoading(true);
    try {
      const isUnlocked = await anonymousUnlockService.isContentUnlocked(contentId, account.address);

      if (isUnlocked) {
        showToast('🎉 解锁状态已恢复！', 'success');
        onRecoverySuccess();
        onClose();
      } else {
        showToast('该钱包地址没有购买过此内容', 'error');
      }
    } catch (error) {
      showToast('验证失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 钱包连接成功后的回调
  const handleWalletConnected = () => {
    setShowWalletModal(false);
    // 连接成功后自动进行验证
    setTimeout(() => {
      handleWalletRecovery();
    }, 500);
  };

  // 通过交易哈希恢复
  const handleTransactionRecovery = async () => {
    if (!transactionHash.trim()) {
      showToast('请输入交易哈希', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await anonymousUnlockService.restoreUnlockByTransaction(
        contentId,
        transactionHash.trim()
      );

      if (result.success) {
        showToast(result.message, 'success');
        onRecoverySuccess();
        onClose();
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      showToast('恢复失败，请稍后重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 导入备份数据
  const handleImportRecovery = async () => {
    if (!importData.trim()) {
      showToast('请输入备份数据', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = anonymousUnlockService.importUserData(importData.trim());

      if (result.success) {
        showToast(`${result.message}，页面将刷新`, 'success');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      showToast('导入失败，请检查数据格式', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">恢复解锁状态</h3>
              <p className="text-sm text-gray-600 mt-1">"{contentTitle}"</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>

          {/* 方法选择 */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
            <button
              onClick={() => setActiveMethod('wallet')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeMethod === 'wallet'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🦊 钱包验证
            </button>
            <button
              onClick={() => setActiveMethod('transaction')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeMethod === 'transaction'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔗 交易哈希
            </button>
            <button
              onClick={() => setActiveMethod('import')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeMethod === 'import'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📂 导入备份
            </button>
          </div>

          {/* 钱包验证方法 */}
          {activeMethod === 'wallet' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-blue-600">🌟</span>
                  <span className="font-medium text-blue-800">推荐方法</span>
                </div>
                <p className="text-blue-700 text-sm">
                  连接您当时用于支付的钱包，我们将自动验证购买记录并恢复解锁状态。
                </p>
              </div>

              {/* 钱包连接状态显示 */}
              {isConnected && account ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-green-800">钱包已连接</span>
                      </div>
                      <p className="text-green-700 text-sm font-mono">
                        {account.address.slice(0, 8)}...{account.address.slice(-6)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-700 text-sm">余额</p>
                      <p className="text-green-800 font-medium">{account.balance} ETH</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-600 text-sm text-center">
                    🔗 尚未连接钱包
                  </p>
                </div>
              )}

              <Button
                onClick={handleWalletRecovery}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? '验证中...' : (isConnected ? '🔍 验证购买记录' : '🦊 连接钱包')}
              </Button>
            </div>
          )}

          {/* 交易哈希方法 */}
          {activeMethod === 'transaction' && (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-orange-600">🔗</span>
                  <span className="font-medium text-orange-800">交易哈希恢复</span>
                </div>
                <p className="text-orange-700 text-sm">
                  如果您保存了当时的交易哈希，可以通过此方法验证购买记录。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  交易哈希
                </label>
                <Input
                  type="text"
                  placeholder="0xabc123..."
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  交易哈希通常以 0x 开头，包含64个字符
                </p>
              </div>

              <Button
                onClick={handleTransactionRecovery}
                disabled={loading || !transactionHash.trim()}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                {loading ? '验证中...' : '🔗 验证交易哈希'}
              </Button>
            </div>
          )}

          {/* 导入备份方法 */}
          {activeMethod === 'import' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-green-600">📂</span>
                  <span className="font-medium text-green-800">导入数据备份</span>
                </div>
                <p className="text-green-700 text-sm">
                  如果您之前导出过购买记录的备份，可以在此恢复所有数据。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  备份数据（JSON格式）
                </label>
                <textarea
                  placeholder='{"version":"1.0","records":[...]}'
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg font-mono text-xs h-32 resize-none"
                />
              </div>

              <Button
                onClick={handleImportRecovery}
                disabled={loading || !importData.trim()}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? '导入中...' : '📂 导入备份数据'}
              </Button>
            </div>
          )}

          {/* 底部提示 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              💡 提示：为避免丢失购买记录，建议您
              <button className="text-blue-600 hover:underline ml-1">
                定期导出备份数据
              </button>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 钱包连接模态框 */}
      <WalletConnectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onSuccess={handleWalletConnected}
      />
    </div>
  );
};