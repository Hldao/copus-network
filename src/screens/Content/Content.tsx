import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { HeaderSection } from "../../components/shared/HeaderSection/HeaderSection";
import { useUser } from "../../contexts/UserContext";
import { useToast } from "../../components/ui/toast";
import { ContentPageSkeleton } from "../../components/ui/skeleton";
import { useArticleDetail } from "../../hooks/queries";
import { getCategoryStyle, getCategoryInlineStyle } from "../../utils/categoryStyles";
import { AuthService } from "../../services/authService";
import { TreasureButton } from "../../components/ui/TreasureButton";
import { ShareDropdown } from "../../components/ui/ShareDropdown";
import { ArticleDetailResponse } from "../../types/article";
import profileDefaultAvatar from "../../assets/images/profile-default.svg";
import { DEMO_PREMIUM_CONTENT, PremiumContentDemo } from "../../data/premiumContentDemo";
import { unlockedContentService } from "../../services/unlockedContentService";
import { PaymentModal, PaymentContent } from "../../components/ui/PaymentModal";
import { backgroundMonitorService } from "../../services/backgroundMonitorService";


// Image URL validation and fallback function
const getValidDetailImageUrl = (imageUrl: string | undefined): string => {
  if (!imageUrl || imageUrl.trim() === '') {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
  }

  // Check if it's a blob URL (from file upload) - these URLs don't work in new sessions
  if (imageUrl.startsWith('blob:')) {
    // Return placeholder as blob URLs are invalid after page refresh
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5VcGxvYWRlZCBJbWFnZTwvdGV4dD48L3N2Zz4=';
  }

  // Check if it's a valid HTTP/HTTPS URL
  try {
    const url = new URL(imageUrl);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return imageUrl;
    } else {
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbnZhbGlkIFVSTDwvdGV4dD48L3N2Zz4=';
    }
  } catch (error) {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjMyMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbnZhbGlkIFVSTDwvdGV4dD48L3N2Zz4=';
  }
};

export const Content = (): JSX.Element => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, getArticleLikeState, updateArticleLikeState } = useUser();
  const { showToast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  // 付费内容相关状态
  const [premiumContent, setPremiumContent] = useState<PremiumContentDemo | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentContent, setPaymentContent] = useState<PaymentContent | null>(null);

  // 检测是否为付费内容
  const isPremiumContentId = id && id.startsWith('premium-demo-');

  // Use new article detail API hook - 只在非付费内容时调用
  const { article, loading, error } = useArticleDetail(!isPremiumContentId ? (id || '') : '');

  // 加载付费内容数据
  useEffect(() => {
    if (isPremiumContentId && id) {
      const foundContent = DEMO_PREMIUM_CONTENT.find(content => content.id === id);
      if (foundContent) {
        // 检查解锁状态
        const isUnlocked = unlockedContentService.isContentUnlocked(id, user?.id?.toString());
        setPremiumContent({ ...foundContent, isUnlocked });
      }
    }
  }, [id, isPremiumContentId, user?.id]);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // 初始化后台监控服务
  useEffect(() => {
    backgroundMonitorService.initialize();

    // 监听解锁状态变化
    const handleUnlockStateChanged = (event: CustomEvent) => {
      const { contentId } = event.detail;

      // 如果当前页面就是被解锁的内容，刷新状态
      if (contentId === id && isPremiumContentId) {
        const foundContent = DEMO_PREMIUM_CONTENT.find(content => content.id === id);
        if (foundContent) {
          const isUnlocked = unlockedContentService.isContentUnlocked(id, user?.id?.toString());
          setPremiumContent({ ...foundContent, isUnlocked });
          showToast('🎉 内容解锁成功！', 'success');
        }
      }
    };

    window.addEventListener('unlockStateChanged', handleUnlockStateChanged as EventListener);

    return () => {
      window.removeEventListener('unlockStateChanged', handleUnlockStateChanged as EventListener);
    };
  }, [id, isPremiumContentId, user?.id]);

  // Debug: Log article data to check arChainId
  useEffect(() => {
    if (article) {
      console.log('📄 Article data:', article);
      console.log('🔗 arChainId:', article.arChainId);
    }
  }, [article]);

  // Convert API data to format needed by page
  const content = article ? {
    id: article.uuid,
    title: article.title,
    description: article.content,
    coverImage: article.coverUrl,
    url: article.targetUrl,
    category: article.categoryInfo?.name || 'General',
    categoryApiColor: article.categoryInfo?.color,
    categoryStyle: getCategoryStyle(article.categoryInfo?.name || 'General', article.categoryInfo?.color),
    categoryInlineStyle: getCategoryInlineStyle(article.categoryInfo?.color),
    userName: article.authorInfo?.username || 'Anonymous',
    userId: article.authorInfo?.id,
    userNamespace: article.authorInfo?.namespace,
    userAvatar: article.authorInfo?.faceUrl && article.authorInfo.faceUrl.trim() !== '' ? article.authorInfo.faceUrl : profileDefaultAvatar,
    date: new Date(article.createAt * 1000).toLocaleDateString(),
    treasureCount: article.likeCount || 0,
    visitCount: `${article.viewCount || 0} Visits`,
    likes: article.likeCount || 0,
    isLiked: article.isLiked || false,
    website: article.targetUrl ? new URL(article.targetUrl).hostname.replace('www.', '') : 'website.com',
  } : null;

  // Debug: Log author info
  if (article) {
    console.log('[Content] Author info:', {
      username: article.authorInfo?.username,
      faceUrl: article.authorInfo?.faceUrl,
      faceUrlLength: article.authorInfo?.faceUrl?.length,
      faceUrlIsEmpty: article.authorInfo?.faceUrl === '',
      namespace: article.authorInfo?.namespace,
      finalAvatar: content?.userAvatar
    });
  }

  // Set like state when article data is fetched
  useEffect(() => {
    if (content && article) {
      // Get global state or use API data
      const globalState = getArticleLikeState(article.uuid, content.isLiked, content.likes);
      setIsLiked(globalState.isLiked);
      setLikesCount(globalState.likeCount);
    }
  }, [content, article, getArticleLikeState]);

  if (loading && !isPremiumContentId) {
    return <ContentPageSkeleton />;
  }

  // 检查是否是文章被删除的情况
  const isArticleDeleted = error && (
    error.includes('not found') || 
    error.includes('不存在') || 
    error.includes('deleted') || 
    error.includes('删除') ||
    error.includes('404')
  );

  if ((error || (!loading && !content)) && !isPremiumContentId) {
    return (
      <div className="min-h-screen w-full flex justify-center overflow-hidden bg-[linear-gradient(0deg,rgba(224,224,224,0.2)_0%,rgba(224,224,224,0.2)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]">
        <div className="flex mt-0 w-full min-h-screen ml-0 relative flex-col items-start">
          <HeaderSection isLoggedIn={!!user} />

          <div className="w-full min-h-screen bg-[linear-gradient(0deg,rgba(224,224,224,0.18)_0%,rgba(224,224,224,0.18)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)] flex items-center justify-center pt-[70px] lg:pt-[120px]">
            <div className="text-center p-8 max-w-md">
              <div className="mb-6">
                <svg className="w-24 h-24 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                {isArticleDeleted ? 'Article has been deleted' : (error ? 'Oops! Something went wrong' : 'Content not found')}
              </h1>
              <p className="text-gray-600 mb-6">
                {isArticleDeleted 
                  ? 'This article has been removed by the author. Please explore other interesting content.' 
                  : (error 
                    ? 'We encountered an issue while loading this content. Please try again later.' 
                    : 'The article you are looking for might have been removed or does not exist.')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link 
                  to="/" 
                  className="px-6 py-3 bg-red text-white rounded-full hover:bg-red/90 transition-colors font-medium"
                >
                  Explore More Content
                </Link>
                {!isArticleDeleted && (
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors font-medium"
                  >
                    Reload Page
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 处理付费内容未找到的情况
  if (isPremiumContentId && !premiumContent) {
    return (
      <div className="min-h-screen w-full flex justify-center overflow-hidden bg-[linear-gradient(0deg,rgba(224,224,224,0.2)_0%,rgba(224,224,224,0.2)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]">
        <div className="flex mt-0 w-full min-h-screen ml-0 relative flex-col items-start">
          <HeaderSection isLoggedIn={!!user} />
          <div className="w-full min-h-screen bg-[linear-gradient(0deg,rgba(224,224,224,0.18)_0%,rgba(224,224,224,0.18)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)] flex items-center justify-center pt-[70px] lg:pt-[120px]">
            <div className="text-center p-8 max-w-md">
              <div className="mb-6">
                <span className="text-6xl">💰</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">付费内容未找到</h1>
              <p className="text-gray-600 mb-6">您访问的付费内容可能不存在或已被移除。</p>
              <Link
                to="/"
                className="px-6 py-3 bg-red text-white rounded-full hover:bg-red/90 transition-colors font-medium"
              >
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleLike = async () => {
    if (!content || !article) return;

    if (!user) {
      showToast('Please log in to treasure this content', 'error', {
        action: {
          label: 'Login',
          onClick: () => navigate('/login')
        }
      });
      return;
    }

    try {
      const newIsLiked = !isLiked;
      const newLikesCount = newIsLiked ? likesCount + 1 : Math.max(0, likesCount - 1);

      // Update local state immediately
      setIsLiked(newIsLiked);
      setLikesCount(newLikesCount);

      // Update global state simultaneously
      updateArticleLikeState(article.uuid, newIsLiked, newLikesCount);

      // Call API
      await AuthService.likeArticle(article.uuid);
      showToast(newIsLiked ? 'Treasured 💖' : 'Untreasured', 'success');

    } catch (error) {
      // Rollback state on API failure
      const originalIsLiked = !isLiked;
      const originalLikesCount = originalIsLiked ? likesCount - 1 : likesCount + 1;

      setIsLiked(originalIsLiked);
      setLikesCount(originalLikesCount);
      updateArticleLikeState(article.uuid, originalIsLiked, originalLikesCount);

      console.error('Like operation failed:', error);
      showToast('Operation failed, please try again', 'error');
    }
  };


  const handleUserClick = () => {
    if (!content?.userNamespace && !premiumContent) return;

    // 对于付费内容，暂时不支持点击用户头像
    if (premiumContent) return;

    // If logged in and it's the current user's own article, navigate to my treasury page
    if (user && user.id === content.userId) {
      navigate('/my-treasury');
    } else {
      // Navigate to the user's profile page using short link format
      navigate(`/u/${content.userNamespace}`);
    }
  };

  // 处理付费内容解锁
  const handleUnlockPremium = () => {
    if (!premiumContent) return;

    // 检查是否已解锁
    if (premiumContent.isUnlocked) {
      showToast('🎉 该内容已解锁！您可以查看完整内容', 'success');
      return;
    }

    // 设置支付信息
    const payment: PaymentContent = {
      id: premiumContent.id,
      title: premiumContent.title,
      author: premiumContent.userName,
      price: premiumContent.price,
      currency: premiumContent.currency,
      network: premiumContent.currency === 'USDC' ? 'ethereum' : 'ethereum'
    };

    setPaymentContent(payment);
    setIsPaymentModalOpen(true);
  };

  // 处理支付成功
  const handlePaymentSuccess = (transactionHash: string) => {
    if (!paymentContent || !premiumContent) return;

    // 为匿名用户生成标识符
    const userIdentifier = user?.id?.toString() ||
      `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 记录解锁状态（原有服务）
    unlockedContentService.unlockContent(
      paymentContent.id,
      transactionHash,
      paymentContent.price,
      paymentContent.currency,
      paymentContent.network,
      userIdentifier
    );


    // 更新本地状态
    setPremiumContent(prev => prev ? { ...prev, isUnlocked: true } : null);

    showToast(
      '🎉 支付成功！内容已解锁，您现在可以查看完整内容了',
      'success',
      { duration: 5000 }
    );
  };

  // 处理支付错误
  const handlePaymentError = (error: string) => {
    showToast(`❌ 支付失败: ${error}`, 'error', { duration: 5000 });
  };

  // 为付费内容创建统一的content对象
  const displayContent = premiumContent ? {
    id: premiumContent.id,
    title: premiumContent.title,
    description: premiumContent.isUnlocked ? premiumContent.description : premiumContent.previewContent,
    coverImage: premiumContent.coverImage,
    url: '#', // 付费内容没有外部链接
    category: premiumContent.category,
    categoryApiColor: null,
    categoryStyle: getCategoryStyle(premiumContent.category),
    categoryInlineStyle: getCategoryInlineStyle(),
    userName: premiumContent.userName,
    userId: premiumContent.userId,
    userNamespace: null,
    userAvatar: premiumContent.userAvatar,
    date: premiumContent.date,
    treasureCount: premiumContent.treasureCount,
    visitCount: `${premiumContent.visitCount} Visits`,
    likes: premiumContent.treasureCount,
    isLiked: premiumContent.isLiked,
    website: 'copus.network',
    isPremium: true,
    isUnlocked: premiumContent.isUnlocked,
    price: premiumContent.price,
    currency: premiumContent.currency
  } : content;

  return (
    <div
      className="min-h-screen w-full flex justify-center overflow-hidden bg-[linear-gradient(0deg,rgba(224,224,224,0.2)_0%,rgba(224,224,224,0.2)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]"
      data-model-id="9091:54529"
    >
      <div className="flex mt-0 w-full min-h-screen ml-0 relative flex-col items-start">
        <HeaderSection isLoggedIn={!!user} />

        <main className="flex flex-col items-start gap-[30px] pt-[70px] lg:pt-[120px] pb-[120px] px-4 relative flex-1 w-full max-w-[1040px] mx-auto grow">
          <article className="flex flex-col items-start justify-between pt-0 pb-[30px] px-0 relative flex-1 self-stretch w-full grow border-b-2 [border-bottom-style:solid] border-[#E0E0E0]">
            <div className="flex flex-col items-start gap-[30px] self-stretch w-full relative flex-[0_0_auto]">
              <div className="flex flex-col lg:flex-row items-start gap-[40px] pt-0 pb-[30px] px-0 relative self-stretch w-full flex-[0_0_auto]">
                <div className="flex flex-col lg:h-[205px] items-start justify-start relative flex-1 grow gap-6">
                  <span
                    className={`relative flex items-center justify-center w-fit [font-family:'Lato',Helvetica] font-medium text-sm text-center tracking-[0.5px] leading-4 whitespace-nowrap capitalize ${
                      displayContent.categoryApiColor ? '' : displayContent.categoryStyle.text
                    }`}
                    style={displayContent.categoryApiColor ? { color: displayContent.categoryInlineStyle.color } : undefined}
                  >
                    {displayContent.category}
                  </span>

                  <h1
                    className="relative self-stretch [font-family:'Lato',Helvetica] font-semibold text-[#231f20] text-[36px] lg:text-[40px] tracking-[-0.5px] leading-[44px] lg:leading-[50px] mt-2 break-all overflow-hidden"
                    style={{
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 2,
                      overflow: 'hidden',
                      wordBreak: 'break-all',
                      overflowWrap: 'break-word'
                    }}
                  >
                    {displayContent.title}
                  </h1>
                </div>

                <div className="relative w-full lg:w-[364px] h-[205px] rounded-lg aspect-[1.78] bg-[url(https://c.animaapp.com/5EW1c9Rn/img/image@2x.png)] bg-cover bg-[50%_50%]"
                     style={{
                       backgroundImage: `url(${getValidDetailImageUrl(displayContent.coverImage)})`
                     }}
                />
              </div>

              <blockquote className="flex flex-col items-start gap-5 p-5 lg:p-[30px] relative self-stretch w-full flex-[0_0_auto] bg-[linear-gradient(0deg,rgba(224,224,224,0.4)_0%,rgba(224,224,224,0.4)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]">
                <div className="flex items-start gap-5 relative self-stretch w-full flex-[0_0_auto]">
                  <div className="w-fit whitespace-nowrap relative mt-[-1.00px] [font-family:'Lato',Helvetica] font-bold text-red text-[50px] tracking-[0] leading-[80.0px]">
                    &quot;
                  </div>

                  <p
                    className="relative flex-1 mt-[-1.00px] [font-family:'Lato',Helvetica] font-light text-off-black text-xl tracking-[0] leading-[32.0px]"
                    style={{
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {displayContent.description}
                    {premiumContent && !premiumContent.isUnlocked && (
                      <span className="block mt-4 text-gray-500 italic">
                        ...完整内容需要付费解锁
                      </span>
                    )}
                  </p>

                  <div className="flex items-end justify-center self-stretch w-5 relative mt-[-1.00px] [font-family:'Lato',Helvetica] font-bold text-red text-[50px] tracking-[0] leading-[80.0px]">
                    &quot;
                  </div>
                </div>

                <cite
                  className="inline-flex items-center gap-2.5 relative flex-[0_0_auto] not-italic cursor-pointer hover:opacity-80 transition-opacity duration-200"
                  onClick={handleUserClick}
                  title={`View ${displayContent.userName}'s profile`}
                >
                  <img
                    className="w-[25px] h-[25px] object-cover relative aspect-[1] rounded-full"
                    alt="Profile image"
                    src={displayContent.userAvatar}
                  />

                  <span className="relative w-fit [font-family:'Lato',Helvetica] font-semibold text-dark-grey text-base tracking-[0] leading-[22.4px] whitespace-nowrap hover:text-blue-600 transition-colors duration-200">
                    {displayContent.userName}
                  </span>
                </cite>
              </blockquote>
            </div>

            <div className="flex h-[25px] items-center justify-between relative self-stretch w-full mt-[50px]">
              <time className="relative w-fit [font-family:'Lato',Helvetica] font-normal text-dark-grey text-base tracking-[0] leading-[23px] whitespace-nowrap">
                {displayContent.date}
              </time>

              <div className="inline-flex items-center gap-5 relative flex-[0_0_auto]">
                <div className="inline-flex items-center gap-[5px] relative flex-[0_0_auto]">
                  <img
                    className="relative w-[21px] h-[15px] aspect-[1.4]"
                    alt="Ic view"
                    src="https://c.animaapp.com/5EW1c9Rn/img/ic-view.svg"
                  />

                  <span className="mt-[-1.00px] relative w-fit [font-family:'Lato',Helvetica] font-normal text-dark-grey text-lg text-center tracking-[0] leading-5 whitespace-nowrap">
                    {article?.viewCount || 0}
                  </span>
                </div>

                {/* Arweave onchain storage link - Always show as clickable */}
                <div
                  className="relative w-6 h-6 cursor-pointer hover:opacity-80 transition-opacity"
                  title={article?.arChainId ? "View on Arweave" : "Arweave storage not available"}
                  onClick={(e) => {
                    e.preventDefault();
                    console.log('🔍 Arweave icon clicked');
                    console.log('📦 Article object:', article);
                    console.log('🔗 arChainId value:', article?.arChainId);

                    if (!article?.arChainId) {
                      console.warn('⚠️ No arChainId available for this article - cannot redirect to Arweave');
                      console.log('💡 Full article data:', JSON.stringify(article, null, 2));
                    } else {
                      const arweaveUrl = `https://arseed.web3infra.dev/${article.arChainId}`;
                      console.log('✅ Opening Arweave URL in new tab:', arweaveUrl);
                      window.open(arweaveUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  <img
                    className="w-full h-full"
                    alt="Arweave ar logo"
                    src="https://c.animaapp.com/5EW1c9Rn/img/arweave-ar-logo-1.svg"
                  />
                </div>
              </div>
            </div>
          </article>
        </main>

        {/* Sticky bottom button bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#E0E0E0] py-5 px-4 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center w-full max-w-[1040px] mx-auto">
            <div className="inline-flex items-center gap-5 relative flex-[0_0_auto]">
              {/* Use unified treasure button component - large size suitable for detail page */}
              <TreasureButton
                isLiked={isLiked}
                likesCount={likesCount}
                onClick={handleLike}
                size="large"
              />

              {/* Share dropdown menu */}
              <ShareDropdown
                title={displayContent.title}
                url={window.location.href}
              />
            </div>

            {/* 根据内容类型显示不同的主要按钮 */}
            {premiumContent ? (
              // 付费内容显示解锁按钮和恢复选项
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={handleUnlockPremium}
                  className={`inline-flex items-center justify-center gap-[15px] px-5 lg:px-[30px] py-2 relative flex-[0_0_auto] rounded-[100px] border border-solid no-underline transition-all ${
                    premiumContent.isUnlocked
                      ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-lg'
                      : 'bg-orange-600 border-orange-600 text-white hover:bg-orange-700'
                  }`}
                >
                  <span className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-bold text-xl tracking-[0] leading-[30px] whitespace-nowrap">
                    {premiumContent.isUnlocked ? '✅ 已解锁' : `🔒 解锁 ${premiumContent.price} ${premiumContent.currency}`}
                  </span>
                </button>

              </div>
            ) : (
              // 普通内容显示访问按钮
              <a
                href={displayContent.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-[15px] px-5 lg:px-[30px] py-2 relative flex-[0_0_auto] bg-red rounded-[100px] border border-solid border-red no-underline"
              >
                <span className="relative flex items-center justify-center w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-bold text-white text-xl tracking-[0] leading-[30px] whitespace-nowrap">
                  Visit
                </span>

                <img
                  className="relative w-[31px] h-[14.73px] mr-[-1.00px]"
                  alt="Arrow"
                  src="https://c.animaapp.com/5EW1c9Rn/img/arrow-1.svg"
                />
              </a>
            )}
          </div>
        </div>

        {/* Payment Modal for Premium Content */}
        {paymentContent && (
          <PaymentModal
            isOpen={isPaymentModalOpen}
            content={paymentContent}
            onClose={() => setIsPaymentModalOpen(false)}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        )}

      </div>
    </div>
  );
};