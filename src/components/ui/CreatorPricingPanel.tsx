import React, { useState } from 'react';
import { Button } from './button';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { Input } from './input';
import { Textarea } from './textarea';

// 支持的稳定币选项
export const CURRENCY_OPTIONS = [
  { value: 'USDC', label: 'USDC', icon: '💵', network: 'ethereum', description: 'USD Coin - 以太坊' },
  { value: 'USDT', label: 'USDT', icon: '💰', network: 'ethereum', description: 'Tether USD - 以太坊' },
  { value: 'USDC.POLY', label: 'USDC', icon: '💵', network: 'polygon', description: 'USD Coin - Polygon' },
  { value: 'USDT.POLY', label: 'USDT', icon: '💰', network: 'polygon', description: 'Tether USD - Polygon' }
];

// 网络选项 (主要支持以太坊和Polygon的稳定币)
export const NETWORK_OPTIONS = [
  { value: 'ethereum', label: 'Ethereum', icon: '⟠', description: '以太坊主网 - 安全性最高' },
  { value: 'polygon', label: 'Polygon', icon: '🔷', description: 'Polygon网络 - 低手续费' }
];

// 稳定币预设价格选项
export const PRESET_PRICES = [
  { currency: 'USDC', prices: ['0.5', '1', '2', '5', '10', '20'] },
  { currency: 'USDT', prices: ['0.5', '1', '2', '5', '10', '20'] },
  { currency: 'USDC.POLY', prices: ['0.5', '1', '2', '5', '10', '20'] },
  { currency: 'USDT.POLY', prices: ['0.5', '1', '2', '5', '10', '20'] }
];

export interface PricingData {
  isPremium: boolean;
  price: string;
  currency: string;
  network: string;
}

export interface CreatorPricingPanelProps {
  pricingData: PricingData;
  onPricingChange: (data: PricingData) => void;
}

export const CreatorPricingPanel: React.FC<CreatorPricingPanelProps> = ({
  pricingData,
  onPricingChange
}) => {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // 获取当前货币的预设价格
  const getCurrentPresetPrices = () => {
    const preset = PRESET_PRICES.find(p => p.currency === pricingData.currency);
    return preset ? preset.prices : [];
  };

  // 处理付费开关切换
  const handlePremiumToggle = () => {
    onPricingChange({
      ...pricingData,
      isPremium: !pricingData.isPremium,
      price: !pricingData.isPremium && !pricingData.price ? "0.01" : pricingData.price
    });
  };

  // 处理价格变更
  const handlePriceChange = (price: string) => {
    onPricingChange({ ...pricingData, price });
  };

  // 处理货币变更
  const handleCurrencyChange = (currency: string) => {
    const currencyOption = CURRENCY_OPTIONS.find(c => c.value === currency);
    onPricingChange({
      ...pricingData,
      currency,
      network: currencyOption?.network || 'ethereum',
      price: "" // 重置价格
    });
  };

  // 处理网络变更
  const handleNetworkChange = (network: string) => {
    onPricingChange({ ...pricingData, network });
  };


  // 计算预估收入
  const calculateEstimatedEarnings = () => {
    if (!pricingData.price) return "0";
    const price = parseFloat(pricingData.price);
    const platformFee = 0.05; // 5% 平台费用
    const earnings = price * (1 - platformFee);
    return earnings.toFixed(4);
  };

  return (
    <Card className="border-2 border-dashed border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* 头部 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">💰</span>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">x402 付费内容设置</h3>
                <p className="text-gray-600 text-sm">使用区块链技术实现内容变现</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {pricingData.isPremium ? '付费内容' : '免费内容'}
              </span>
              <button
                onClick={handlePremiumToggle}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  pricingData.isPremium ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    pricingData.isPremium ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 付费设置区域 */}
          {pricingData.isPremium && (
            <div className="space-y-4">
              {/* 价格设置 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  设置价格
                </label>

                {/* 货币选择 */}
                <div className="flex items-center space-x-2 mb-3">
                  {CURRENCY_OPTIONS.map((currency) => (
                    <button
                      key={currency.value}
                      onClick={() => handleCurrencyChange(currency.value)}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-lg border transition-all ${
                        pricingData.currency === currency.value
                          ? 'border-purple-300 bg-purple-100 text-purple-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-purple-200'
                      }`}
                    >
                      <span>{currency.icon}</span>
                      <span className="text-sm font-medium">{currency.label}</span>
                    </button>
                  ))}
                </div>

                {/* 价格输入 */}
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="输入价格"
                      value={pricingData.price}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      className="text-lg font-semibold"
                    />
                  </div>
                  <Badge variant="outline" className="whitespace-nowrap">
                    {CURRENCY_OPTIONS.find(c => c.value === pricingData.currency)?.icon} {pricingData.currency}
                  </Badge>
                </div>

                {/* 预设价格快捷选择 */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {getCurrentPresetPrices().map((price) => (
                    <button
                      key={price}
                      onClick={() => handlePriceChange(price)}
                      className={`px-3 py-1 rounded-full text-xs border transition-all ${
                        pricingData.price === price
                          ? 'border-purple-300 bg-purple-100 text-purple-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-purple-200'
                      }`}
                    >
                      {price} {pricingData.currency}
                    </button>
                  ))}
                </div>
              </div>

              {/* 网络选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  区块链网络
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {NETWORK_OPTIONS.map((network) => (
                    <button
                      key={network.value}
                      onClick={() => handleNetworkChange(network.value)}
                      className={`flex items-center space-x-2 p-3 rounded-lg border transition-all ${
                        pricingData.network === network.value
                          ? 'border-purple-300 bg-purple-100 text-purple-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-purple-200'
                      }`}
                    >
                      <span>{network.icon}</span>
                      <span className="text-sm font-medium">{network.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 付费内容说明 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-blue-600">🔗</span>
                  <span className="font-medium text-blue-800">目标链接付费访问</span>
                </div>
                <p className="text-blue-700 text-sm">
                  用户需要付费后才能访问您分享的目标链接内容。您的策展描述将始终免费可见，帮助用户了解内容价值。
                </p>
              </div>

              {/* 收入预估 */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-green-800">预估收入</div>
                    <div className="text-xs text-green-600">扣除5%平台费用后</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-700">
                      {calculateEstimatedEarnings()} {pricingData.currency}
                    </div>
                    <div className="text-xs text-green-600">每次购买</div>
                  </div>
                </div>
              </div>

              {/* x402协议信息 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-600">🔒</span>
                  <div className="text-sm">
                    <span className="font-medium text-blue-800">x402协议保护</span>
                    <p className="text-blue-600 text-xs mt-1">
                      您的内容将通过x402开放支付协议进行加密保护，确保只有付费用户才能访问完整内容
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 免费内容说明 */}
          {!pricingData.isPremium && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <span className="text-gray-600">🌟</span>
                <div className="text-sm">
                  <span className="font-medium text-gray-800">免费分享</span>
                  <p className="text-gray-600 text-xs mt-1">
                    您的内容将免费向所有用户开放，这有助于扩大影响力和建立粉丝群体
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};