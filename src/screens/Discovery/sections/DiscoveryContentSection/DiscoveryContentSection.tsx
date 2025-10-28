import React from "react";
import { useNavigate } from "react-router-dom";
import { useArticles } from "../../../../hooks/useArticles";
import { Article } from "../../../../types/article";
import { ArticleListSkeleton } from "../../../../components/ui/skeleton";
import { useToast } from "../../../../components/ui/toast";
import { useUser } from "../../../../contexts/UserContext";
import { ArticleCard, ArticleData } from "../../../../components/ArticleCard";
import { getCategoryStyle, getCategoryInlineStyle, formatDate, formatCount } from "../../../../utils/categoryStyles";
import profileDefaultAvatar from "../../../../assets/images/profile-default.svg";
import { DEMO_PREMIUM_CONTENT } from "../../../../data/premiumContentDemo";
import { PaymentModal, PaymentContent } from "../../../../components/ui/PaymentModal";
import { x402PaymentService } from "../../../../services/x402PaymentService";
import { unlockedContentService } from "../../../../services/unlockedContentService";

export const DiscoveryContentSection = (): JSX.Element => {
  const { showToast } = useToast();
  const { user, getArticleLikeState, updateArticleLikeState, toggleLike, syncArticleStates } = useUser();
  const [localArticles, setLocalArticles] = React.useState<Article[]>([]);
  const [premiumDemos, setPremiumDemos] = React.useState(DEMO_PREMIUM_CONTENT);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [currentPaymentContent, setCurrentPaymentContent] = React.useState<PaymentContent | null>(null);
  const navigate = useNavigate();

  // 页面加载时检查解锁状态
  React.useEffect(() => {
    const updatedDemos = DEMO_PREMIUM_CONTENT.map(demo => {
      const isUnlocked = unlockedContentService.isContentUnlocked(demo.id, user?.id?.toString());
      return { ...demo, isUnlocked };
    });
    setPremiumDemos(updatedDemos);
  }, [user?.id]);

  // Set test token to ensure API authentication - temporarily disable expired token
  // React.useEffect(() => {
  //   const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYjE1MzM2NDUtYzZjOC00MmJkLTgwOTQtM2QzYjI4N2VkOWNkIiwidXNlcl90eXBlIjoidXNlciIsInVzZXJfbmFtZSI6IjE2MTEwMTEwNjE1IiwiYWNjb3VudF90eXBlIjoidGVzdCIsImV4cCI6MTcyNzY4MTc5OSwidXNlcl9yb2xlIjoidXNlciIsImlhdCI6MTcyNzU5NTM5OSwidWlkIjoiYjE1MzM2NDUtYzZjOC00MmJkLTgwOTQtM2QzYjI4N2VkOWNkIn0.QkqDnbMaXFgaZhKc0CIFNZNLfqLnGqO2XZyNKiEtXOU';
  //   localStorage.setItem('copus_token', testToken);
  //     // }, []);

  // Welcome guide display state management
  const [showWelcomeGuide, setShowWelcomeGuide] = React.useState(false);

  // Check if this is the first visit today (based on login status)
  React.useEffect(() => {
    const today = new Date().toDateString();
    // Use different storage keys for logged-in and guest users
    const storageKey = user ? `copus_last_guide_shown_${user.id}` : 'copus_last_guide_shown_guest';
    const lastVisitDate = localStorage.getItem(storageKey);

    if (lastVisitDate !== today) {
      setShowWelcomeGuide(true);
      const userType = user ? 'logged-in user' : 'guest';
    }
  }, [user]); // Depends on user state

  // Close welcome guide
  const handleCloseWelcomeGuide = () => {
    const today = new Date().toDateString();
    // Use different storage keys for logged-in and guest users
    const storageKey = user ? `copus_last_guide_shown_${user.id}` : 'copus_last_guide_shown_guest';
    localStorage.setItem(storageKey, today);
    setShowWelcomeGuide(false);
    const userType = user ? 'logged-in user' : 'guest';
  };

  const { articles, loading, error, refresh, loadMore, hasMore } = useArticles();


  // Ensure data refresh each time page is entered or regains focus
  React.useEffect(() => {
    const handleFocus = () => {
      refresh();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refresh();
      }
    };

    // Listen to window focus event
    window.addEventListener('focus', handleFocus);
    // Listen to page visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refresh]); // Add refresh dependency, but remove refresh call on page load

  // Scroll to load more logic
  React.useEffect(() => {
    const handleScroll = () => {
      // Check if scrolled near the bottom of the page
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrolledToBottom = scrollTop + windowHeight >= documentHeight - 1000; // Trigger 1000px early

      if (scrolledToBottom && hasMore && !loading) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hasMore, loading, loadMore]);

  // Render different guide content based on user login status
  const renderGuideContent = () => {
    if (user) {
      // Logged-in users: functional guidance
      return (
        <>
          <h1 className="relative w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-semibold text-dark-grey text-2xl tracking-[0] leading-9 whitespace-nowrap">
            Welcome to Copus
          </h1>
          <div className="w-full max-w-[736px] flex flex-col items-start gap-3">
            <p className="text-dark-grey text-lg leading-[27px] relative self-stretch [font-family:'Lato',Helvetica] font-normal tracking-[0]">
              <span className="[font-family:'Lato',Helvetica] font-normal text-[#454545] text-lg tracking-[0] leading-[27px]">
                Discover high-quality content recommended by real users. Here,
                there are no algorithmic recommendations, only knowledge sharing
                between people.
              </span>
            </p>
            <p className="text-dark-grey text-lg leading-[27px] relative self-stretch [font-family:'Lato',Helvetica] font-normal tracking-[0]">
              <span className="[font-family:'Lato',Helvetica] font-normal text-[#454545] text-lg tracking-[0] leading-[27px]">
                Start exploring content that interests you, or click the +
                button in the lower right corner to share your treasured finds.
              </span>
            </p>
          </div>
        </>
      );
    } else {
      // Guest users: platform introduction (using English, maintaining same styling)
      return (
        <>
          <h1 className="relative w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-semibold text-dark-grey text-2xl tracking-[0] leading-9 whitespace-nowrap">
            Welcome to Copus
          </h1>
          <div className="w-full max-w-[736px] flex flex-col items-start gap-3">
            <p className="text-dark-grey text-lg leading-[27px] relative self-stretch [font-family:'Lato',Helvetica] font-normal tracking-[0]">
              <span className="[font-family:'Lato',Helvetica] font-normal text-[#454545] text-lg tracking-[0] leading-[27px]">
                Discover a new way to share and explore knowledge. Copus is a community-driven platform where real people curate and share high-quality content they find valuable.
              </span>
            </p>
            <p className="text-dark-grey text-lg leading-[27px] relative self-stretch [font-family:'Lato',Helvetica] font-normal tracking-[0]">
              <span className="[font-family:'Lato',Helvetica] font-normal text-[#454545] text-lg tracking-[0] leading-[27px]">
                <strong>Human-curated content</strong> with no algorithms, just genuine recommendations from our community.
                <button
                  onClick={() => navigate('/login')}
                  className="inline-block ml-1 font-semibold text-red hover:text-red/80 transition-colors underline cursor-pointer"
                >
                  Join us
                </button> to build your personal treasure trove of discoveries.
              </span>
            </p>
          </div>
        </>
      );
    }
  };

  // Sync local article state and like status
  React.useEffect(() => {
    setLocalArticles(articles);

    // Sync like status to localStorage
    if (articles.length > 0) {
      const articlesForSync = articles.map(article => ({
        id: article.id,
        uuid: article.id,
        isLiked: article.isLiked, // Use actual like status returned from server
        likeCount: article.treasureCount || 0
      }));
      syncArticleStates(articlesForSync);
    }
  }, [articles]); // Remove syncArticleStates dependency to avoid infinite loop

  // 付费内容演示数据配置
  const premiumContentSettings = {
    'AI技术深度解析': { isPremium: true, price: '0.01 ETH', currency: 'ETH' },
    'Web3开发实战指南': { isPremium: true, price: '0.005 ETH', currency: 'ETH' },
    '区块链投资策略': { isPremium: true, price: '2 USDC', currency: 'USDC' },
    'React高级模式': { isPremium: true, price: '1.5 USDC', currency: 'USDC' }
  };

  // Transform article data format
  const transformArticleToCardData = (article: Article): ArticleData => {
    // 检查是否为演示付费内容
    const premiumSetting = Object.entries(premiumContentSettings).find(([keyword]) =>
      article.title.includes(keyword)
    );

    const isPremium = !!premiumSetting;
    const premiumData = premiumSetting ? premiumSetting[1] : {};

    return {
      id: article.id,
      uuid: article.id, // Use id as uuid
      title: article.title,
      description: article.description,
      coverImage: article.coverImage,
      category: article.category,
      categoryColor: article.categoryColor,
      userName: article.userName,
      userAvatar: article.userAvatar || profileDefaultAvatar,
      userId: article.userId,
      namespace: article.namespace, // Add namespace field
      date: article.date,
      treasureCount: article.treasureCount,
      visitCount: `${article.visitCount || 0} Visits`,
      isLiked: article.isLiked, // Use actual like status returned from server
      targetUrl: article.url,
      website: article.website,
      // 付费内容相关字段
      isPremium,
      price: premiumData.price,
      currency: premiumData.currency,
      isUnlocked: false, // 默认未解锁
      previewContent: isPremium ? `${article.description.slice(0, 100)}...` : undefined
    };
  };

  // Handle like action
  const handleLike = async (articleId: string, currentIsLiked: boolean, currentLikeCount: number) => {
    if (!user) {
      showToast('Please log in to treasure this content', 'error', {
        action: {
          label: 'Login',
          onClick: () => navigate('/login')
        }
      });
      return;
    }

    await toggleLike(articleId, currentIsLiked, currentLikeCount);
  };

  // Handle user click
  const handleUserClick = (userId: number) => {
    // Find the corresponding user's namespace from current articles
    const article = localArticles.find(a => a.userId === userId);

    if (user && user.id === userId) {
      navigate('/my-treasury');
    } else if (article?.namespace) {
      // Prioritize using namespace to navigate to user profile page
      navigate(`/u/${article.namespace}`);
    } else {
      // Fallback to using userId
      navigate(`/user/${userId}/treasury`);
    }
  };

  // Handle unlock premium content
  const handleUnlock = (articleId: string, price: string, currency: string) => {
    // 检查是否已经解锁过
    const isAlreadyUnlocked = unlockedContentService.isContentUnlocked(articleId, user?.id?.toString());

    if (isAlreadyUnlocked) {
      const unlockDetails = unlockedContentService.getUnlockDetails(articleId, user?.id?.toString());
      showToast(
        `🎉 该内容已解锁！您可以直接查看完整内容`,
        'success',
        {
          duration: 4000,
          action: {
            label: '查看解锁详情',
            onClick: () => {
              if (unlockDetails) {
                const unlockDate = new Date(unlockDetails.unlockedAt).toLocaleString();
                const shortHash = unlockDetails.transactionHash.slice(0, 8) + '...' + unlockDetails.transactionHash.slice(-6);
                showToast(
                  `✅ 解锁时间: ${unlockDate}\n💰 支付价格: ${unlockDetails.price} ${unlockDetails.currency}\n🔗 交易哈希: ${shortHash}`,
                  'info',
                  { duration: 8000 }
                );
              }
            }
          }
        }
      );

      // 直接更新状态为已解锁
      setPremiumDemos(prev =>
        prev.map(demo =>
          demo.id === articleId
            ? { ...demo, isUnlocked: true }
            : demo
        )
      );
      return;
    }

    // 查找对应的内容信息
    const demoContent = premiumDemos.find(demo => demo.id === articleId);
    if (!demoContent) return;

    // 设置支付内容信息
    const paymentContent: PaymentContent = {
      id: articleId,
      title: demoContent.title,
      author: demoContent.userName,
      price: price,
      currency: currency,
      network: currency.includes('USDC') || currency.includes('USDT') ?
        (currency.includes('.POLY') ? 'polygon' : 'ethereum') : 'ethereum'
    };

    setCurrentPaymentContent(paymentContent);
    setIsPaymentModalOpen(true);
  };

  // 处理支付成功
  const handlePaymentSuccess = async (transactionHash: string) => {
    if (!currentPaymentContent) return;

    // 记录解锁状态到持久化存储
    unlockedContentService.unlockContent(
      currentPaymentContent.id,
      transactionHash,
      currentPaymentContent.price,
      currentPaymentContent.currency,
      currentPaymentContent.network,
      user?.id?.toString()
    );

    showToast(
      `🎉 支付成功！内容已解锁，您现在可以查看完整内容了`,
      'success',
      {
        duration: 6000,
        action: {
          label: '查看交易详情',
          onClick: () => {
            const shortHash = transactionHash.slice(0, 8) + '...' + transactionHash.slice(-6);
            showToast(
              `✅ 支付完成\n💰 金额: ${currentPaymentContent.price} ${currentPaymentContent.currency}\n🌐 网络: ${currentPaymentContent.network}\n🔗 交易哈希: ${shortHash}`,
              'info',
              { duration: 10000 }
            );
          }
        }
      }
    );

    // 更新演示数据状态 - 标记为已解锁
    setPremiumDemos(prev =>
      prev.map(demo =>
        demo.id === currentPaymentContent.id
          ? { ...demo, isUnlocked: true }
          : demo
      )
    );

    // 更新本地状态 - 标记为已解锁
    setLocalArticles(prev =>
      prev.map(article =>
        article.id === currentPaymentContent.id
          ? { ...article, isUnlocked: true }
          : article
      )
    );
  };

  // 处理支付错误
  const handlePaymentError = (error: string) => {
    showToast(
      `❌ 支付失败: ${error}`,
      'error',
      {
        duration: 6000,
        action: {
          label: '重新支付',
          onClick: () => {
            if (currentPaymentContent) {
              setIsPaymentModalOpen(true);
            }
          }
        }
      }
    );
  };

  // 关闭支付模态框
  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setCurrentPaymentContent(null);
  };

  // 渲染演示付费内容卡片
  const renderPremiumDemoCard = (demo: any, index: number) => {
    const articleData: ArticleData = {
      id: demo.id,
      uuid: demo.id,
      title: demo.title,
      description: demo.description,
      coverImage: demo.coverImage,
      category: demo.category,
      userName: demo.userName,
      userAvatar: demo.userAvatar,
      userId: demo.userId,
      date: demo.date,
      treasureCount: demo.treasureCount,
      visitCount: `${demo.visitCount} Visits`,
      isLiked: demo.isLiked,
      isPremium: demo.isPremium,
      price: demo.price,
      currency: demo.currency,
      isUnlocked: demo.isUnlocked,
      previewContent: demo.previewContent
    };

    return (
      <div key={demo.id}>
        <ArticleCard
          article={articleData}
          layout="discovery"
          actions={{
            showTreasure: true,
            showVisits: true,
            showUnlock: true
          }}
          onLike={(id, isLiked, count) => {
            // 演示用 - 更新点赞状态
            setPremiumDemos(prev =>
              prev.map(d =>
                d.id === id
                  ? { ...d, isLiked: !isLiked, treasureCount: isLiked ? count - 1 : count + 1 }
                  : d
              )
            );
          }}
          onUserClick={handleUserClick}
          onUnlock={handleUnlock}
        />
      </div>
    );
  };

  const renderPostCard = (post: Article, index: number) => {
    const articleData = transformArticleToCardData(post);
    const articleLikeState = getArticleLikeState(post.id, post.isLiked, post.treasureCount);

    // Update article like status
    articleData.isLiked = articleLikeState.isLiked;
    articleData.treasureCount = articleLikeState.likeCount;

    // 检查本地解锁状态
    const localArticle = localArticles.find(a => a.id === post.id);
    if (localArticle?.isUnlocked) {
      articleData.isUnlocked = true;
    }

    // Check if this is the current user's own article
    const isOwnArticle = user && user.id === post.userId;

    return (
      <div key={post.id}>
        <ArticleCard
          article={articleData}
          layout="discovery"
          actions={{
            showTreasure: true,
            showVisits: true,
            showUnlock: true
          }}
          onLike={handleLike}
          onUserClick={handleUserClick}
          onUnlock={handleUnlock}
        />
      </div>
    );
  };

  // Loading state
  if (loading && articles.length === 0) {
    return (
      <section className="px-5">
        <ArticleListSkeleton />
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className="flex items-center justify-center min-h-screen px-5">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading articles: {error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  // Empty state
  if (articles.length === 0) {
    return (
      <section className="flex items-center justify-center min-h-screen px-5">
        <div className="text-center">
          <p className="text-gray-500">No articles found.</p>
        </div>
      </section>
    );
  }

  return (
    <main className="flex flex-col items-start gap-10 py-0 relative flex-1">
      {/* x402 Protocol Banner */}
      <section className="w-full bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 text-white rounded-lg p-6 shadow-lg border-2 border-orange-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-3xl">🔗</span>
              <div>
                <h2 className="text-xl font-bold">x402 开放支付协议</h2>
                <p className="text-orange-100 text-sm">基于HTTP的内容付费标准 - 安全、快速、去中心化</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-orange-100">支持的网络</div>
              <div className="flex items-center space-x-2 mt-1">
                <span className="px-2 py-1 bg-white/20 rounded text-xs">⟠ ETH</span>
                <span className="px-2 py-1 bg-white/20 rounded text-xs">🔷 MATIC</span>
                <span className="px-2 py-1 bg-white/20 rounded text-xs">🔵 ARB</span>
                <span className="px-2 py-1 bg-white/20 rounded text-xs">🔷 BASE</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span>🛡️</span>
              <span>安全加密交易</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>⚡</span>
              <span>即时内容解锁</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>🌐</span>
              <span>跨链兼容性</span>
            </div>
          </div>
        </div>
      </section>

      {/* Welcome Guide Bar - Display different content based on login status */}
      {showWelcomeGuide && (
        <section className="pl-4 sm:pl-[30px] pr-4 py-4 sm:py-[30px] rounded-lg border-l-[3px] [border-left-style:solid] border-red shadow-[1px_1px_10px_#c5c5c5] bg-[linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)] flex items-start gap-[15px] relative w-full min-h-fit overflow-hidden">
          {/* Close button - Keep in top right corner */}
          <button
            onClick={handleCloseWelcomeGuide}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors duration-200 group z-20"
            aria-label="Close welcome guide"
          >
            <svg
              className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="flex-1 pr-4 sm:pr-[120px] min-w-0">
            {renderGuideContent()}
          </div>

          {/* Octopus image, properly sized to ensure full visibility, positioned at bottom right edge */}
          <div className="absolute bottom-0 right-0 w-[90px] h-[90px] sm:w-[110px] sm:h-[110px] z-10">
            <img
              className="w-full h-full object-contain object-right-bottom rounded-lg"
              alt="Red Octopus"
              src="https://c.animaapp.com/1aPszOHA/img/mask-group.png"
            />
          </div>
        </section>
      )}

      {/* Premium Content Demo Section */}
      <section className="w-full px-2.5 lg:px-0">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">🎯 付费内容演示</h2>
          <p className="text-gray-600 text-sm">体验 x402 支付协议的付费内容功能</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[repeat(auto-fill,minmax(408px,1fr))] gap-4 lg:gap-8">
          {premiumDemos.map((demo, index) => renderPremiumDemoCard(demo, index))}
        </div>
      </section>

      {/* Content Cards Section - Responsive Grid Layout */}
      <section className="w-full pt-0 pb-[30px] min-h-screen px-2.5 lg:px-0">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">📚 发现更多内容</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[repeat(auto-fill,minmax(408px,1fr))] gap-4 lg:gap-8">
          {localArticles.map((post, index) => renderPostCard(post, index))}
        </div>
      </section>

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="text-lg text-gray-600">Loading more content...</div>
        </div>
      )}

      {/* No more content hint */}
      {!loading && !hasMore && articles.length > 0 && (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">You've reached the bottom! No more content to load.</div>
        </div>
      )}

      {/* x402 Payment Modal */}
      {currentPaymentContent && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          content={currentPaymentContent}
          onClose={handleClosePaymentModal}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      )}
    </main>
  );
};