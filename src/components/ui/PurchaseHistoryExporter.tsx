import React, { useState } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { useToast } from './toast';
import { anonymousUnlockService } from '../../services/anonymousUnlockService';

export interface PurchaseHistoryExporterProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseHistoryExporter: React.FC<PurchaseHistoryExporterProps> = ({
  isOpen,
  onClose
}) => {
  const [exportData, setExportData] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  // 导出用户数据
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = anonymousUnlockService.exportUserData();
      setExportData(data);

      // 自动下载文件
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `x402-purchase-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('购买记录已导出并下载', 'success');
    } catch (error) {
      showToast('导出失败，请稍后重试', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // 复制到剪贴板
  const handleCopyToClipboard = async () => {
    if (!exportData) return;

    try {
      await navigator.clipboard.writeText(exportData);
      showToast('已复制到剪贴板', 'success');
    } catch (error) {
      showToast('复制失败，请手动选择文本', 'error');
    }
  };

  // 获取统计信息
  const getStats = () => {
    const history = anonymousUnlockService.getLocalUnlockHistory();
    const totalSpent = history.reduce((acc, record) => {
      const currency = record.currency;
      acc[currency] = (acc[currency] || 0) + parseFloat(record.price);
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPurchases: history.length,
      totalSpent,
      lastPurchase: history.length > 0 ? new Date(history[0].unlockedAt).toLocaleDateString() : '无'
    };
  };

  const stats = getStats();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">购买记录导出</h3>
              <p className="text-sm text-gray-600 mt-1">备份您的x402付费内容购买记录</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>

          {/* 统计信息 */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-3">📊 购买统计</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">购买次数</div>
                <div className="text-lg font-semibold text-purple-700">{stats.totalPurchases}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">总支出</div>
                <div className="text-lg font-semibold text-purple-700">
                  {Object.entries(stats.totalSpent).map(([currency, amount]) => (
                    <div key={currency}>{amount.toFixed(2)} {currency}</div>
                  )) || '0'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">最近购买</div>
                <div className="text-lg font-semibold text-purple-700">{stats.lastPurchase}</div>
              </div>
            </div>
          </div>

          {/* 导出按钮 */}
          <div className="space-y-4">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isExporting ? '导出中...' : '📥 导出购买记录'}
            </Button>

            {/* 导出数据预览 */}
            {exportData && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    导出数据预览
                  </label>
                  <Button
                    onClick={handleCopyToClipboard}
                    variant="outline"
                    size="sm"
                  >
                    📋 复制
                  </Button>
                </div>
                <textarea
                  value={exportData}
                  readOnly
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg font-mono text-xs bg-gray-50 resize-none"
                />
              </div>
            )}
          </div>

          {/* 重要提示 */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-yellow-600">⚠️</span>
              <span className="font-medium text-yellow-800">重要提示</span>
            </div>
            <div className="text-yellow-700 text-sm space-y-2">
              <p>• 请妥善保存这个备份文件，它包含了您所有的购买记录</p>
              <p>• 在其他设备上可以通过"导入备份"功能恢复您的解锁状态</p>
              <p>• 定期导出备份可以避免因浏览器数据清除而丢失购买记录</p>
              <p>• 备份文件不包含敏感信息，但建议安全存储</p>
            </div>
          </div>

          {/* 使用说明 */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-blue-600">💡</span>
              <span className="font-medium text-blue-800">使用说明</span>
            </div>
            <div className="text-blue-700 text-sm space-y-1">
              <p>1. 点击"导出购买记录"按钮会自动下载备份文件</p>
              <p>2. 您也可以复制上方的JSON数据手动保存</p>
              <p>3. 在需要恢复时，使用"已购买？恢复解锁状态" → "导入备份"功能</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};