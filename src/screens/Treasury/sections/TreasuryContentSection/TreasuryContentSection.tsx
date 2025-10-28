import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../../../components/ui/button";
import { AuthService } from "../../../../services/authService";
import { useUser } from "../../../../contexts/UserContext";
import { useToast } from "../../../../components/ui/toast";
import { formatDate } from "../../../../utils/categoryStyles";
import { ArticleCard, ArticleData } from "../../../../components/ArticleCard";
import profileDefaultAvatar from "../../../../assets/images/profile-default.svg";
import { unlockedContentService } from "../../../../services/unlockedContentService";
import { DEMO_PREMIUM_CONTENT } from "../../../../data/premiumContentDemo";

interface TreasuryArticle extends ArticleData {
  // 继承ArticleData，保持类型一致性
}

export const TreasuryContentSection = (): JSX.Element => {
  const { user, articleLikeStates, socialLinks, getArticleLikeState, toggleLike } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [likedArticles, setLikedArticles] = useState<TreasuryArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [treasuryStats, setTreasuryStats] = useState({
    likedArticleCount: 0,
    articleCount: 0,
    myArticleLikedCount: 0
  });

  // 标签页状态
  const [activeTab, setActiveTab] = useState<'liked' | 'unlocked'>('liked');
  const [unlockedContent, setUnlockedContent] = useState<TreasuryArticle[]>([]);


  // 获取用户收藏的文章
  useEffect(() => {
    const fetchLikedArticles = async () => {

      if (!user) {
        setLikedArticles([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // 同时获取宝藏信息和收藏文章列表
        const [treasuryInfoResponse, likedArticlesResponse] = await Promise.all([
          AuthService.getUserTreasuryInfo(),
          AuthService.getUserLikedArticles(1, 20), // 获取前20篇文章
        ]);


        // 处理统计信息
        const treasuryInfo = treasuryInfoResponse.data || treasuryInfoResponse;
        if (treasuryInfo.statistics) {
          setTreasuryStats(treasuryInfo.statistics);
        }

        // 社交链接数据直接从UserContext获取，无需额外API调用

        // 处理文章列表，转换为组件需要的格式
        const articlesData = likedArticlesResponse.data || likedArticlesResponse;

        // 尝试多种可能的数据结构
        let articlesArray = [];
        if (articlesData && Array.isArray(articlesData.data)) {
          // 标准结构：{ data: [...] }
          articlesArray = articlesData.data;
        } else if (Array.isArray(articlesData)) {
          // 直接是数组：[...]
          articlesArray = articlesData;
        } else {
          articlesArray = [];
        }


        const articles = articlesArray
          .filter((article: any) => {
            // Filter out user's own articles - users shouldn't see their own articles in collection
            return article.authorInfo?.id !== user?.id;
          })
          .sort((a: any, b: any) => {
            // Sort by creation time in descending order (newest first)
            return (b.createAt || 0) - (a.createAt || 0);
          })
          .map((article: any, index: number): TreasuryArticle => {

          try {
            return {
              id: article.uuid,
              uuid: article.uuid,
              title: article.title,
              description: article.content,
              coverImage: article.coverUrl,
              category: article.categoryInfo?.name || 'General',
              categoryColor: article.categoryInfo?.color,
              userName: article.authorInfo?.username || 'Anonymous',
              userId: article.authorInfo?.id,
              userAvatar: article.authorInfo?.faceUrl || profileDefaultAvatar,
              date: new Date(article.createAt * 1000).toLocaleDateString(),
              treasureCount: article.likeCount || 0,
              visitCount: `${article.viewCount || 0} Visits`,
              isLiked: article.isLiked || true, // 收藏页面的文章都是已点赞的
              targetUrl: article.targetUrl,
              website: article.targetUrl ? new URL(article.targetUrl).hostname.replace('www.', '') : 'website.com'
            };
          } catch (err) {
            console.error('❌ 转换文章数据失败:', err, article);
            return null;
          }
        }).filter(Boolean) as TreasuryArticle[]; // 过滤掉转换失败的文章

        setLikedArticles(articles);

        // Scroll to top when articles are loaded
        window.scrollTo({ top: 0, behavior: 'smooth' });

      } catch (error) {
        console.error('❌ 获取收藏文章失败:', error);
        const errorMessage = error instanceof Error ? error.message : '获取收藏文章失败';
        setError(errorMessage);
        showToast('获取宝藏数据失败，请稍后重试', 'error');
        setLikedArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLikedArticles();
  }, [user]);

  // 获取已解锁的付费内容
  useEffect(() => {
    const loadUnlockedContent = () => {
      if (!user) {
        setUnlockedContent([]);
        return;
      }

      // 获取用户已解锁的内容
      const userUnlockedContents = unlockedContentService.getUserUnlockedContents(user.id.toString());

      // 转换为TreasuryArticle格式
      const unlockedArticles = userUnlockedContents
        .map(unlockRecord => {
          // 从演示数据中找到对应的内容
          const originalContent = DEMO_PREMIUM_CONTENT.find(content => content.id === unlockRecord.contentId);
          if (!originalContent) return null;

          return {
            id: originalContent.id,
            uuid: originalContent.id,
            title: originalContent.title,
            description: originalContent.description,
            coverImage: originalContent.coverImage,
            category: originalContent.category,
            categoryColor: null,
            userName: originalContent.userName,
            userId: originalContent.userId,
            userAvatar: originalContent.userAvatar,
            date: new Date(unlockRecord.unlockedAt).toLocaleDateString(),
            treasureCount: originalContent.treasureCount,
            visitCount: `${originalContent.visitCount} Visits`,
            isLiked: originalContent.isLiked,
            targetUrl: `/work/${originalContent.id}`, // 指向详情页
            website: 'copus.network',
            isPremium: true,
            isUnlocked: true,
            price: unlockRecord.price,
            currency: unlockRecord.currency,
            unlockDetails: {
              transactionHash: unlockRecord.transactionHash,
              unlockedAt: unlockRecord.unlockedAt,
              network: unlockRecord.network
            }
          } as TreasuryArticle & {
            isPremium: boolean;
            isUnlocked: boolean;
            price: string;
            currency: string;
            unlockDetails: any;
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          // 按解锁时间倒序排列
          return (b?.unlockDetails?.unlockedAt || 0) - (a?.unlockDetails?.unlockedAt || 0);
        }) as TreasuryArticle[];

      setUnlockedContent(unlockedArticles);
    };

    loadUnlockedContent();
  }, [user]);

  // Refresh collection when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        // Re-fetch collection when page becomes visible
        const fetchLikedArticles = async () => {
          try {
            const likedArticlesResponse = await AuthService.getUserLikedArticles(1, 20);
            const articlesData = likedArticlesResponse.data || likedArticlesResponse;

            let articlesArray = [];
            if (articlesData && Array.isArray(articlesData.data)) {
              articlesArray = articlesData.data;
            } else if (Array.isArray(articlesData)) {
              articlesArray = articlesData;
            }

            const articles = articlesArray
              .filter((article: any) => {
                // Filter out user's own articles
                return article.authorInfo?.id !== user?.id;
              })
              .sort((a: any, b: any) => {
                // Sort by creation time in descending order (newest first)
                return (b.createAt || 0) - (a.createAt || 0);
              })
              .map((article: any): TreasuryArticle => {
                return {
                  id: article.uuid,
                  uuid: article.uuid,
                  title: article.title,
                  description: article.content,
                  coverImage: article.coverUrl,
                  category: article.categoryInfo?.name || 'General',
                  categoryColor: article.categoryInfo?.color,
                  userName: article.authorInfo?.username || 'Anonymous',
                  userId: article.authorInfo?.id,
                  userAvatar: article.authorInfo?.faceUrl || profileDefaultAvatar,
                  date: new Date(article.createAt * 1000).toLocaleDateString(),
                  treasureCount: article.likeCount || 0,
                  visitCount: `${article.viewCount || 0} Visits`,
                  isLiked: article.isLiked || true,
                  targetUrl: article.targetUrl,
                  website: article.targetUrl ? new URL(article.targetUrl).hostname.replace('www.', '') : 'website.com'
                };
              });

            setLikedArticles(articles);

            // Scroll to top when collection is refreshed
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (error) {
            console.error('Error refreshing collection:', error);
          }
        };

        fetchLikedArticles();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  // 处理点赞
  const handleLike = async (articleId: string, currentIsLiked: boolean, currentLikeCount: number) => {
    if (!user) {
      showToast('请先登录', 'error');
      return;
    }

    // 使用全局toggleLike函数，包含乐观更新和API调用
    const result = await toggleLike(
      articleId,
      currentIsLiked,
      currentLikeCount,
      // 本地乐观更新回调（可选，因为全局状态已经处理了）
      (isLiked: boolean, likeCount: number) => {
        setLikedArticles(prev => prev.map(art =>
          art.id === articleId
            ? { ...art, isLiked, treasureCount: likeCount }
            : art
        ));
      }
    );

  };

  // 处理用户点击
  const handleUserClickInternal = (userId: number, userNamespace?: string) => {
    // 如果是当前用户自己的文章，跳转到我的宝藏页面
    if (user && user.id === userId) {
      navigate('/my-treasury');
    } else if (userNamespace) {
      // 如果有namespace，使用短链接格式
      navigate(`/u/${userNamespace}`);
    } else {
      // 如果没有namespace，使用userId作为降级方案
      navigate(`/user/${userId}/treasury`);
    }
  };

  // 渲染单个文章卡片
  const renderArticleCard = (article: TreasuryArticle) => {
    // 获取当前文章的点赞状态
    const articleLikeState = getArticleLikeState(article.id, article.isLiked, article.treasureCount);

    // 更新文章的点赞状态
    const articleData = {
      ...article,
      isLiked: articleLikeState.isLiked,
      treasureCount: articleLikeState.likeCount
    };

    // Check if this is the current user's own article
    const isOwnArticle = user && user.id === article.userId;

    // 创建包装函数来传递namespace信息
    const handleUserClickForArticle = (userId: number) => {
      handleUserClickInternal(userId, article.namespace || article.userNamespace);
    };

    return (
      <ArticleCard
        key={article.id}
        article={articleData}
        layout="treasury"
        actions={{
          showTreasure: true, // Show treasure button for all articles
          showVisits: true,
          showWebsite: true, // 显示网站信息
          showBranchIt: true // 显示Branch It图标
        }}
        onLike={handleLike}
        onUserClick={handleUserClickForArticle}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-start gap-[30px] pb-5 min-h-screen">
        <header className="flex items-start justify-between w-full">
          <h1 className="font-h-3 font-[number:var(--h-3-font-weight)] text-off-black text-[length:var(--h-3-font-size)] tracking-[var(--h-3-letter-spacing)] leading-[var(--h-3-line-height)] [font-style:var(--h-3-font-style)]">
            我的宝藏
          </h1>
        </header>
        <div className="flex items-center justify-center w-full h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    const isAuthError = error.includes('认证') || error.includes('登录');

    return (
      <div className="flex flex-col items-start gap-[30px] pb-5 min-h-screen">
        <header className="flex items-start justify-between w-full">
          <h1 className="font-h-3 font-[number:var(--h-3-font-weight)] text-off-black text-[length:var(--h-3-font-size)] tracking-[var(--h-3-letter-spacing)] leading-[var(--h-3-line-height)] [font-style:var(--h-3-font-style)]">
            我的宝藏
          </h1>
        </header>
        <div className="flex flex-col items-center justify-center w-full h-64 text-center gap-4">
          <div className={isAuthError ? "text-yellow-600" : "text-red-500"}>
            {error}
          </div>
          {isAuthError && (
            <div className="flex gap-3">
              <Button
                onClick={() => { window.location.href = '/login'; }}
                className="bg-red hover:bg-red/90 text-white px-6 py-2 rounded-lg"
              >
                重新登录
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="px-6 py-2 rounded-lg"
              >
                刷新页面
              </Button>
              <Link to="/">
                <Button
                  variant="outline"
                  className="px-6 py-2 rounded-lg"
                >
                  返回首页
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-[30px] pb-5 min-h-screen">
      <header className="flex items-start justify-between w-full">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h1 className="font-h-3 font-[number:var(--h-3-font-weight)] text-off-black text-[length:var(--h-3-font-size)] tracking-[var(--h-3-letter-spacing)] leading-[var(--h-3-line-height)] [font-style:var(--h-3-font-style)]">
              我的宝藏
            </h1>
          </div>

          {/* 社交链接显示区域（只读） */}
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-4 flex-wrap">
              {socialLinks
                .filter(link => link.linkUrl && link.linkUrl.trim())
                .map((link) => (
                  <a
                    key={link.id}
                    href={link.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors duration-200 group"
                    title={`访问 ${link.title}`}
                  >
                    <img
                      className="w-4 h-4 flex-shrink-0"
                      alt={`${link.title} logo`}
                      src={link.iconUrl || 'https://c.animaapp.com/w7obk4mX/img/link-icon.svg'}
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                      {link.title}
                    </span>
                  </a>
                ))
              }
            </div>
          )}

          {/* 标签页导航 */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('liked')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'liked'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                💖 我的收藏
                {treasuryStats.likedArticleCount > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                    {treasuryStats.likedArticleCount}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('unlocked')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'unlocked'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                🔓 已解锁内容
                {unlockedContent.length > 0 && (
                  <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full">
                    {unlockedContent.length}
                  </span>
                )}
              </span>
            </button>
          </div>

          <p className="text-gray-600 text-base">
            {activeTab === 'liked'
              ? (treasuryStats.likedArticleCount > 0
                  ? `共收藏了 ${treasuryStats.likedArticleCount} 篇文章`
                  : '还没有收藏任何文章'
                )
              : (unlockedContent.length > 0
                  ? `已解锁 ${unlockedContent.length} 个付费内容`
                  : '还没有解锁任何付费内容'
                )
            }
          </p>
        </div>

        <Button
          variant="outline"
          className="h-10 gap-3 px-5 py-[15px] rounded-[100px] border-[#686868] font-p font-[number:var(--p-font-weight)] text-dark-grey text-[length:var(--p-font-size)] tracking-[var(--p-letter-spacing)] leading-[var(--p-line-height)] [font-style:var(--p-font-style)] hover:bg-gray-50 transition-colors"
          onClick={() => showToast('收藏管理功能开发中', 'info')}
        >
          管理收藏
        </Button>
      </header>

      {/* 根据当前标签页显示不同内容 */}
      {activeTab === 'liked' ? (
        // 我的收藏标签页
        likedArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full h-64 text-center">
            <img
              className="w-16 h-16 mb-4 opacity-50"
              alt="Empty treasure"
              src="https://c.animaapp.com/mft5gmofxQLTNf/img/treasure-icon.svg"
            />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">宝藏空空如也</h3>
            <p className="text-gray-500 mb-4">点赞喜欢的文章，它们就会出现在这里</p>
            <Link
              to="/"
              className="px-4 py-2 bg-yellow text-white rounded-lg hover:bg-yellow/90 transition-colors"
            >
              去发现好内容
            </Link>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 lg:grid-cols-[repeat(auto-fill,minmax(408px,1fr))] gap-8 px-0 lg:px-5">
            {likedArticles.map((article) => renderArticleCard(article))}
          </div>
        )
      ) : (
        // 已解锁内容标签页
        unlockedContent.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full h-64 text-center">
            <div className="w-16 h-16 mb-4 flex items-center justify-center">
              <span className="text-4xl opacity-50">🔒</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">还没有解锁任何内容</h3>
            <p className="text-gray-500 mb-4">购买付费内容后，它们就会出现在这里</p>
            <Link
              to="/"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              探索付费内容
            </Link>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 lg:grid-cols-[repeat(auto-fill,minmax(408px,1fr))] gap-8 px-0 lg:px-5">
            {unlockedContent.map((content) => (
              <div key={content.id} className="relative">
                {renderArticleCard(content)}
                {/* 已解锁标识 */}
                <div className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm">
                  <span>✅</span>
                  <span>已解锁</span>
                </div>
                {/* 解锁信息 */}
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-gray-600">
                  💰 {(content as any).price} {(content as any).currency}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
