import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useUser } from "../../../../contexts/UserContext";
import { AuthService } from "../../../../services/authService";
import { Avatar, AvatarImage } from "../../../../components/ui/avatar";
import { Button } from "../../../../components/ui/button";
import profileDefaultAvatar from "../../../../assets/images/profile-default.svg";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs";
import { useToast } from "../../../../components/ui/toast";
import { ArticleCard, ArticleData } from "../../../../components/ArticleCard";


const collectionItems = [
  {
    id: 1,
    category: "Art",
    categoryColor:
      "border-[#2b8649] bg-[linear-gradient(0deg,rgba(43,134,73,0.2)_0%,rgba(43,134,73,0.2)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]",
    categoryTextColor: "text-green",
    coverImage: "https://c.animaapp.com/mftam89xRJwsqQ/img/cover.png",
    title: "Window Swap",
    description: "Explore the world through window, what's inside?",
    url: "productdesign.com",
    userImage: "https://c.animaapp.com/mftam89xRJwsqQ/img/-profile-image-1.png",
    userName: "User Name",
    date: "Nov 15, 2022",
    treasureCount: "999",
    visitCount: "999 Visits",
    cardBg: "bg-white",
  },
  {
    id: 2,
    category: "Life",
    categoryColor:
      "border-[#ea7db7] bg-[linear-gradient(0deg,rgba(234,125,183,0.2)_0%,rgba(234,125,183,0.2)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]",
    categoryTextColor: "text-pink",
    coverImage: "https://c.animaapp.com/mftam89xRJwsqQ/img/cover-1.png",
    title: "Window Swap",
    description: "Explore the world through window, what's inside?",
    url: "productdesign.com",
    userImage: "https://c.animaapp.com/mftam89xRJwsqQ/img/-profile-image-1.png",
    userName: "User Name",
    date: "Nov 15, 2022",
    treasureCount: "999",
    visitCount: "999 Visits",
    cardBg:
      "shadow-[1px_1px_10px_#c5c5c5] bg-[linear-gradient(0deg,rgba(224,224,224,0.25)_0%,rgba(224,224,224,0.25)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]",
  },
];

const myShareItems = [
  {
    id: 3,
    category: "Technology",
    categoryColor:
      "border-[#2191fb] bg-[linear-gradient(0deg,rgba(33,145,251,0.2)_0%,rgba(33,145,251,0.2)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]",
    categoryTextColor: "text-blue",
    coverImage: "https://c.animaapp.com/mft5gmofxQLTNf/img/cover-1.png",
    title: "My Shared Content",
    description: "Content I've shared with the community",
    url: "mywebsite.com",
    userImage: "https://c.animaapp.com/mft4oqz6uyUKY7/img/profile.png",
    userName: "Sophiaaaaa",
    date: "Nov 20, 2022",
    treasureCount: "156",
    visitCount: "2.1k Visits",
    cardBg: "bg-white",
  },
  {
    id: 4,
    category: "Design",
    categoryColor:
      "border-[#e19e1d] bg-[linear-gradient(0deg,rgba(225,159,29,0.2)_0%,rgba(225,159,29,0.2)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]",
    categoryTextColor: "text-yellow",
    coverImage: "https://c.animaapp.com/mft5gmofxQLTNf/img/cover-3.png",
    title: "Design Resources",
    description: "My favorite design tools and resources",
    url: "designtools.com",
    userImage: "https://c.animaapp.com/mft4oqz6uyUKY7/img/profile.png",
    userName: "Sophiaaaaa",
    date: "Nov 18, 2022",
    treasureCount: "89",
    visitCount: "1.5k Visits",
    cardBg: "bg-white",
  },
];

export const MainContentSection = (): JSX.Element => {
  const navigate = useNavigate();
  const { namespace } = useParams<{ namespace?: string }>();
  const [searchParams] = useSearchParams();
  const { user, socialLinks: socialLinksData, getArticleLikeState, toggleLike } = useUser();

  // Get tab from URL parameter, default to "collection"
  const activeTab = searchParams.get('tab') || 'collection';
  const { showToast } = useToast();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // 直接在组件内实现图片预览
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [previewImageAlt, setPreviewImageAlt] = useState('');

  // 统一状态管理
  const [treasuryUserInfo, setTreasuryUserInfo] = useState<any>(null);
  const [userInfoLoading, setUserInfoLoading] = useState(true);
  const [userInfoError, setUserInfoError] = useState<string | null>(null);

  // 收藏文章状态
  const [likedArticles, setLikedArticles] = useState<any[]>([]);
  const [likedArticlesLoading, setLikedArticlesLoading] = useState(false);
  const [likedArticlesError, setLikedArticlesError] = useState<string | null>(null);

  // 创作文章状态
  const [createdArticles, setCreatedArticles] = useState<any[]>([]);
  const [createdArticlesLoading, setCreatedArticlesLoading] = useState(false);
  const [createdArticlesError, setCreatedArticlesError] = useState<string | null>(null);

  // 添加缓存机制防止重复请求
  const [lastFetchedUserId, setLastFetchedUserId] = useState<number | null>(null);
  const [lastFetchedTab, setLastFetchedTab] = useState<string | null>(null);

  const [treasuryStats, setTreasuryStats] = useState({
    likedArticleCount: 0,
    articleCount: 0,
    myArticleLikedCount: 0
  });

  // Track if account is enabled
  const [accountEnabled, setAccountEnabled] = useState(true);

  // 已解锁内容状态
  const [unlockedContent, setUnlockedContent] = useState<any[]>([]);

  // 判断是否在查看其他用户的宝藏
  // 如果有namespace参数但是namespace等于当前用户的namespace，说明是在查看自己的页面
  const isViewingOtherUser = !!namespace && namespace !== user?.namespace;
  const targetNamespace = namespace || user?.namespace;

  // 移除对404 API的调用，改用统计信息显示


  // 1. 首先获取用户信息和ID
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!isViewingOtherUser && !user) {
        setTreasuryUserInfo(null);
        setUserInfoLoading(false);
        return;
      }

      if (isViewingOtherUser && !targetNamespace) {
        setUserInfoError('User namespace is invalid');
        setUserInfoLoading(false);
        return;
      }

      try {
        setUserInfoLoading(true);
        setUserInfoError(null);

        let userInfo;
        if (isViewingOtherUser && targetNamespace) {
          // 查看其他用户的信息
          userInfo = await AuthService.getUserHomeInfo(targetNamespace);
        } else if (user?.namespace) {
          // 查看自己的信息，通过namespace获取完整信息
          userInfo = await AuthService.getUserHomeInfo(user.namespace);
        } else {
          // 降级方案
          userInfo = await AuthService.getUserTreasuryInfo();
        }


        const processedInfo = userInfo.data || userInfo;

        // Check if account is disabled/deleted and use default images
        if (processedInfo.isEnabled === false || processedInfo.isEnabled === 0) {
          console.log('[MyTreasury] Account is disabled/deleted, using default images');
          setAccountEnabled(false);
          processedInfo.faceUrl = profileDefaultAvatar;
          processedInfo.coverUrl = 'https://c.animaapp.com/w7obk4mX/img/banner.png';
          processedInfo.bio = "This account doesn't exist";
        } else {
          setAccountEnabled(true);
        }

        setTreasuryUserInfo(processedInfo);
        if (processedInfo.statistics) {
          setTreasuryStats(processedInfo.statistics);
        }

      } catch (error) {
        console.error('❌ 获取用户信息失败:', error);
        setUserInfoError(`获取用户信息失败: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
        setUserInfoLoading(false);
      }
    };

    fetchUserInfo();
  }, [user, namespace, isViewingOtherUser, targetNamespace]);

  // 2. 根据当前标签页和用户信息获取相应的文章数据
  useEffect(() => {
    if (userInfoLoading || !treasuryUserInfo) {
      return; // 等待用户信息加载完成
    }

    const userId = treasuryUserInfo.id || user?.id;
    if (!userId) {
      console.warn('⚠️ 无法获取用户ID，跳过文章数据加载');
      return;
    }

    // 检查是否已经获取过相同用户和标签页的数据，避免重复请求
    if (lastFetchedUserId === userId && lastFetchedTab === activeTab) {
      return;
    }

    const fetchArticleData = async () => {
      try {
        setLastFetchedUserId(userId);
        setLastFetchedTab(activeTab);

        if (activeTab === 'collection') {
          // 只在收藏标签页时加载收藏文章
          await fetchLikedArticles(userId);
        } else if (activeTab === 'share') {
          // 只在创作标签页时加载创作文章
          await fetchCreatedArticles(userId);
        } else if (activeTab === 'unlocked' && !isViewingOtherUser) {
          // 只在已解锁标签页且查看自己的页面时加载已解锁内容
          await fetchUnlockedContent();
        }
      } catch (error) {
        console.error('❌ 加载文章数据失败:', error);
        // 请求失败时重置缓存，允许重试
        setLastFetchedUserId(null);
        setLastFetchedTab(null);
      }
    };

    fetchArticleData();
  }, [treasuryUserInfo?.id, activeTab]);

  // 收藏文章加载函数
  const fetchLikedArticles = async (userId: number) => {
    setLikedArticlesLoading(true);
    setLikedArticlesError(null);

    try {
      const response = await AuthService.getMyLikedArticlesCorrect(1, 10, userId);

      const articlesArray = extractArticlesFromResponse(response, '收藏');
      setLikedArticles(articlesArray);

    } catch (error) {
      console.error('❌ 获取收藏文章失败:', error);
      setLikedArticlesError(`获取收藏文章失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setLikedArticles([]);
    } finally {
      setLikedArticlesLoading(false);
    }
  };

  // 创作文章加载函数
  const fetchCreatedArticles = async (userId: number) => {
    setCreatedArticlesLoading(true);
    setCreatedArticlesError(null);

    try {
      const response = await AuthService.getMyCreatedArticles(1, 10, userId);

      const articlesArray = extractArticlesFromResponse(response, '创作');
      setCreatedArticles(articlesArray);

    } catch (error) {
      console.error('❌ 获取创作文章失败:', error);
      setCreatedArticlesError(`获取创作文章失败: ${error instanceof Error ? error.message : '未知错误'}`);
      setCreatedArticles([]);
    } finally {
      setCreatedArticlesLoading(false);
    }
  };

  // 获取已解锁的付费内容
  const fetchUnlockedContent = async () => {
    try {
      if (!user) {
        setUnlockedContent([]);
        return;
      }

      console.log('Fetching unlocked content for user:', user.id);

      // 暂时返回空数组，避免错误
      setUnlockedContent([]);

      // TODO: 实现真正的数据获取逻辑
      // const userUnlockedContents = unlockedContentService.getUserUnlockedContents(user.id.toString());

    } catch (error) {
      console.error('❌ 获取已解锁内容失败:', error);
      setUnlockedContent([]);
    }
  };

  // 统一的文章数据提取函数
  const extractArticlesFromResponse = (response: any, type: string) => {
    if (response?.data?.data && Array.isArray(response.data.data)) {
      console.log(`✅ ${type}文章使用嵌套结构 response.data.data:`, response.data.data.length, '条记录');
      return response.data.data;
    } else if (response?.data && Array.isArray(response.data)) {
      console.log(`✅ ${type}文章使用标准结构 response.data:`, response.data.length, '条记录');
      return response.data;
    } else if (Array.isArray(response)) {
      console.log(`✅ ${type}文章使用直接数组结构:`, response.length, '条记录');
      return response;
    } else if (response?.data === '' || response?.data === null) {
      console.log(`📭 ${type}文章API返回空数据`);
      return [];
    } else {
      console.warn(`⚠️ ${type}文章未识别的API响应结构:`, {
        type: typeof response,
        hasData: !!response?.data,
        dataType: typeof response?.data,
        keys: response ? Object.keys(response) : []
      });
      return [];
    }
  };

  // 将API数据转换为收藏卡片格式
  const transformLikedApiToCard = (article: any): ArticleData => {
    return {
      id: article.uuid,
      uuid: article.uuid,
      title: article.title,
      description: article.content,
      coverImage: article.coverUrl || 'https://c.animaapp.com/mft5gmofxQLTNf/img/cover-1.png',
      category: article.categoryInfo?.name || '未分类',
      categoryColor: article.categoryInfo?.color || '#666666',
      userName: article.authorInfo?.username || 'Anonymous',
      userAvatar: article.authorInfo?.faceUrl || profileDefaultAvatar,
      userId: article.authorInfo?.id,
      userNamespace: article.authorInfo?.namespace,
      date: new Date((article.createAt || article.publishAt) * 1000).toISOString(),
      treasureCount: article.likeCount || 0,
      visitCount: article.viewCount || 0,
      isLiked: article.isLiked || true,
      targetUrl: article.targetUrl,
      website: article.targetUrl ? new URL(article.targetUrl).hostname : undefined
    };
  };

  // 将API数据转换为创作卡片格式（与收藏格式相同）
  const transformCreatedApiToCard = (article: any): ArticleData => {
    return {
      id: article.uuid,
      uuid: article.uuid,
      title: article.title,
      description: article.content,
      coverImage: article.coverUrl || 'https://c.animaapp.com/mft5gmofxQLTNf/img/cover-1.png',
      category: article.categoryInfo?.name || '未分类',
      categoryColor: article.categoryInfo?.color || '#666666',
      userName: article.authorInfo?.username || 'Anonymous',
      userAvatar: article.authorInfo?.faceUrl || profileDefaultAvatar,
      userId: article.authorInfo?.id,
      userNamespace: article.authorInfo?.namespace,
      date: new Date((article.createAt || article.publishAt) * 1000).toISOString(),
      treasureCount: article.likeCount || 0,
      visitCount: article.viewCount || 0,
      isLiked: article.isLiked || false, // 创作文章的点赞状态来自API
      targetUrl: article.targetUrl,
      website: article.targetUrl ? new URL(article.targetUrl).hostname : undefined
    };
  };

  // Handle like/unlike
  const handleLike = async (articleId: string, currentIsLiked: boolean, currentLikeCount: number) => {
    if (!user) {
      showToast('Please login first', 'error');
      return;
    }

    // Call the API to toggle like
    await toggleLike(articleId, currentIsLiked, currentLikeCount);

    // If we're on the collection tab and the article was liked (now being unliked)
    // remove it from the likedArticles list
    if (activeTab === 'collection' && currentIsLiked) {
      setLikedArticles(prev => prev.filter(article => article.uuid !== articleId && article.id !== articleId));
    }
  };

  // 处理用户点击 - 现在需要传递namespace
  const handleUserClick = (userId: number | undefined, userNamespace?: string) => {
    // 如果没有userId和namespace，直接返回
    if (!userId && !userNamespace) {
      return;
    }

    // 如果没有namespace，尝试从文章数据中查找
    if (!userNamespace && userId !== undefined) {
      // 在likedArticles中查找 - 这些是收藏的文章，作者信息在authorInfo中
      const likedArticle = likedArticles.find(a => a.userId === userId);
      if (likedArticle) {
        userNamespace = likedArticle.userNamespace;
      }

      // 注：之前会在myCreatedData中查找，但该API已移除
    }

    // 判断是否是当前用户
    // 优先使用namespace判断（更准确），其次才是id
    const isCurrentUser = (user && userNamespace && user.namespace === userNamespace) ||
                         (user && userId && user.id === userId && !userNamespace);

    if (isCurrentUser) {
      // 如果是点击自己，跳转到自己的宝藏页面
      navigate('/my-treasury');
    } else if (userNamespace) {
      // 跳转到其他用户的宝藏页面
      navigate(`/u/${userNamespace}`);
    } else if (userId) {
      // 如果没有namespace，使用userId作为降级方案
      navigate(`/user/${userId}/treasury`);
    }
  };

  // 处理头像点击预览
  const handleAvatarClick = useCallback((e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    // 从点击的元素获取实际显示的头像URL
    let actualAvatarUrl = null;

    // 尝试从多种可能的点击目标获取头像URL
    if (e?.target) {
      if (e.target.tagName === 'IMG') {
        actualAvatarUrl = e.target.src;
      } else if (e.target.querySelector && e.target.querySelector('img')) {
        actualAvatarUrl = e.target.querySelector('img').src;
      } else if (e.currentTarget && e.currentTarget.querySelector && e.currentTarget.querySelector('img')) {
        actualAvatarUrl = e.currentTarget.querySelector('img').src;
      }
    }

    // 根据是否查看其他用户来获取正确的头像和用户名
    const currentUser = isViewingOtherUser ? treasuryUserInfo : user;

    // 智能头像URL获取：支持真实头像和系统生成头像
    let avatarUrl;

    // 优先尝试API中的真实头像字段
    const realAvatarUrl = (currentUser?.faceUrl && currentUser.faceUrl.trim()) ||
                         (currentUser?.avatarUrl && currentUser.avatarUrl.trim()) ||
                         (currentUser?.avatar && currentUser.avatar.trim()) ||
                         (currentUser?.profileImage && currentUser.profileImage.trim()) ||
                         (currentUser?.data?.faceUrl && currentUser.data.faceUrl.trim()) ||
                         (currentUser?.data?.avatarUrl && currentUser.data.avatarUrl.trim()) ||
                         (currentUser?.data?.avatar && currentUser.data.avatar.trim()) ||
                         (currentUser?.data?.profileImage && currentUser.data.profileImage.trim());

    if (realAvatarUrl) {
      avatarUrl = realAvatarUrl;
    } else if (actualAvatarUrl) {
      avatarUrl = actualAvatarUrl;
    } else {
      avatarUrl = profileDefaultAvatar;
    }

    // 直接设置预览状态
    setShowImagePreview(true);
    setPreviewImageUrl(avatarUrl);
    setPreviewImageAlt(`${currentUser?.username || 'User'}'s avatar`);
  }, [isViewingOtherUser, treasuryUserInfo, user]);

  // ESC键关闭预览
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showImagePreview) {
        setShowImagePreview(false);
        setPreviewImageUrl('');
        setPreviewImageAlt('');
      }
    };

    if (showImagePreview) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [showImagePreview]);

  // Share personal homepage - copy Instagram-style short link ✨
  const handleShare = () => {
    const currentNamespace = isViewingOtherUser ? treasuryUserInfo?.namespace : user?.namespace;
    if (currentNamespace) {
      const shortLink = `${window.location.origin}/u/${currentNamespace}`;
      navigator.clipboard.writeText(shortLink).then(() => {
        showToast('Link copied to clipboard! Share it now! 🎉', 'success');
      }).catch(() => {
        showToast('Failed to copy link, please copy manually: ' + shortLink, 'error');
      });
    }
  };

  const renderCard = (card: ArticleData) => {
    const articleLikeState = getArticleLikeState(card.id, card.isLiked || true, typeof card.treasureCount === 'string' ? parseInt(card.treasureCount) || 0 : card.treasureCount);

    // 更新文章的点赞状态
    const articleData = {
      ...card,
      isLiked: articleLikeState.isLiked,
      treasureCount: articleLikeState.likeCount
    };

    return (
      <ArticleCard
        key={card.id}
        article={articleData}
        layout="discovery"
        actions={{
          showTreasure: true,
          showVisits: true
        }}
        onLike={handleLike}
        onUserClick={handleUserClick}
      />
    );
  };

  // 将API数据转换为我的分享卡片格式
  const transformApiToCard = (article: any): ArticleData => {
    return {
      id: article.uuid,
      uuid: article.uuid,
      title: article.title,
      description: article.content,
      coverImage: article.coverUrl || 'https://c.animaapp.com/mft5gmofxQLTNf/img/cover-1.png',
      category: article.categoryInfo?.name || 'General',
      categoryColor: article.categoryInfo?.color || 'gray',
      userName: article.authorInfo?.username || user?.username || 'Anonymous',
      userAvatar: article.authorInfo?.faceUrl || user?.faceUrl || profileDefaultAvatar,
      userId: article.authorInfo?.id || user?.id,
      userNamespace: article.authorInfo?.namespace || user?.namespace,
      date: new Date(article.createAt * 1000).toLocaleDateString(),
      treasureCount: article.likeCount || 0,
      visitCount: `${article.viewCount || 0} Visits`,
      isLiked: false,
      targetUrl: article.targetUrl,
      website: article.targetUrl ? new URL(article.targetUrl).hostname.replace('www.', '') : 'website.com'
    };
  };

  // 处理编辑
  const handleEdit = (articleId: string) => {
    // 导航到编辑页面，传递文章ID
    navigate(`/create?edit=${articleId}`);
  };

  // 处理删除
  const handleDelete = (articleId: string) => {
    // Find the article to delete
    const article = createdArticles.find(a => a.uuid === articleId);
    if (article) {
      setArticleToDelete(article);
      setDeleteDialogOpen(true);
    }
  };

  // 专门用于My Share标签的卡片渲染函数，支持悬浮编辑和删除
  const renderMyShareCard = (card: ArticleData) => {
    // 获取文章的点赞状态
    const articleLikeState = getArticleLikeState(card.id, card.isLiked || false, typeof card.treasureCount === 'string' ? parseInt(card.treasureCount) || 0 : card.treasureCount);

    // 更新文章的点赞状态
    const articleData = {
      ...card,
      isLiked: articleLikeState.isLiked,
      treasureCount: articleLikeState.likeCount
    };

    return (
      <ArticleCard
        key={card.id}
        article={articleData}
        layout="discovery"
        actions={{
          showTreasure: true, // Always show treasure button for unified style
          showVisits: true,
          showEdit: !isViewingOtherUser, // 只有查看自己的页面才显示编辑
          showDelete: !isViewingOtherUser // 只有查看自己的页面才显示删除
        }}
        isHovered={hoveredCard === card.id}
        onLike={handleLike} // Always provide like callback
        onEdit={handleEdit}
        onDelete={handleDelete}
        onUserClick={handleUserClick}
        onMouseEnter={() => setHoveredCard(card.id)}
        onMouseLeave={() => setHoveredCard(null)}
      />
    );
  };

  // 处理删除文章
  const handleDeleteArticle = async () => {
    if (!articleToDelete) {
      return;
    }

    setIsDeleting(true);
    try {
      // Call delete API with UUID (not numeric ID)
      const deleteResult = await AuthService.deleteArticle(articleToDelete.uuid);

      console.log('Delete article response:', JSON.stringify(deleteResult, null, 2));
      console.log('Response keys:', Object.keys(deleteResult));
      console.log('Response.data:', deleteResult.data);
      console.log('Response.status:', deleteResult.status);

      // 检查删除是否真正成功 - handle various response formats
      const isSuccess =
        deleteResult === true ||
        deleteResult.data === true ||
        deleteResult.status === 1 ||
        deleteResult.status === 200 ||
        (deleteResult.data && deleteResult.data.status === 1);

      if (isSuccess) {
        showToast("Curated link deleted successfully", "success");
      } else {
        console.error('Delete failed, full response:', JSON.stringify(deleteResult, null, 2));
        showToast("Delete failed, curated link may not exist or no permission to delete", "warning");
        setDeleteDialogOpen(false);
        setArticleToDelete(null);
        setIsDeleting(false);
        return;
      }

      // 更新UI状态以立即反映删除操作，而不是重新获取整个列表
      setCreatedArticles(prev => prev.filter(article => article.uuid !== articleToDelete.uuid));
      
      // 如果在收藏列表中也有这篇文章，同时更新收藏列表
      setLikedArticles(prev => prev.filter(article => article.uuid !== articleToDelete.uuid));

      setDeleteDialogOpen(false);
      setArticleToDelete(null);
    } catch (error: any) {
      console.error('Delete curated link failed:', error);

      // If it's because the backend API is not implemented, provide a special prompt
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        showToast("Delete feature is under development, coming soon", "warning");
      } else {
        showToast(error.message || "Error deleting curated link, please try again later", "error");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-[30px] pb-5 min-h-screen">
      <section className="flex flex-col items-start w-full">
        <div className="relative self-stretch w-full h-[200px] rounded-lg overflow-hidden bg-gradient-to-r from-blue-100 to-purple-100">
          <img
            src={(isViewingOtherUser ? treasuryUserInfo?.coverUrl : user?.coverUrl) || 'https://c.animaapp.com/mftam89xRJwsqQ/img/banner.png'}
            alt="Cover"
            className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-300"
          />
          {/* Show "This account doesn't exist" text overlay when account is disabled */}
          {!accountEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
              <p className="text-white text-2xl font-normal [font-family:'Lato',Helvetica] tracking-wide">
                This account doesn't exist
              </p>
            </div>
          )}
        </div>

        <div className="gap-4 lg:gap-6 px-4 lg:pl-5 lg:pr-10 py-0 mt-[-46px] flex flex-col lg:flex-row items-start lg:items-start w-full">
          <Avatar
            className="w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] border-2 border-solid border-[#ffffff] cursor-pointer hover:scale-105 transition-transform duration-300"
            onClick={handleAvatarClick}
            onMouseDown={handleAvatarClick}
            onTouchStart={handleAvatarClick}
            title="Click to view avatar in full size"
          >
            <AvatarImage
              src={
                (isViewingOtherUser ? treasuryUserInfo?.faceUrl : user?.faceUrl) ||
                profileDefaultAvatar
              }
              className="object-cover"
              style={{ pointerEvents: 'none' }}
            />
          </Avatar>

          <div className="flex flex-col items-start gap-5 pt-0 lg:pt-[60px] pb-0 px-0 flex-1 grow w-full">
            <div className="inline-flex flex-col items-start justify-center">
              <div className="inline-flex items-center gap-[15px]">
                <h1 className="mt-[-1.00px] [font-family:'Lato',Helvetica] font-medium text-off-black text-3xl tracking-[0] leading-[42px] whitespace-nowrap">
                  {isViewingOtherUser ? (treasuryUserInfo?.username || "Loading...") : (user?.username || "Guest User")}
                </h1>

                {/* Show "Account deleted" text beside username when account is disabled */}
                {!accountEnabled && (
                  <span className="text-gray-600 text-lg font-normal [font-family:'Lato',Helvetica]">
                    Account deleted
                  </span>
                )}

                {/* Only show share button if account is enabled */}
                {accountEnabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 h-auto hover:scale-110 transition-transform duration-200"
                    onClick={handleShare}
                    title={`Share @${isViewingOtherUser ? treasuryUserInfo?.namespace : user?.namespace}'s profile link`}
                  >
                    <img
                      className="w-[38px] h-[38px]"
                      alt="Share"
                      src="https://c.animaapp.com/mfuxsdcbXwMuVe/img/share.svg"
                    />
                  </Button>
                )}
              </div>

              <p className="[font-family:'Lato',Helvetica] font-normal text-dark-grey text-lg tracking-[0] leading-[25.2px] whitespace-nowrap">
                @{isViewingOtherUser ? (treasuryUserInfo?.namespace || 'loading') : (user?.namespace || 'unknown')}
              </p>
            </div>

            <div className="flex-col gap-[15px] flex items-start w-full">
              <div className="flex items-center gap-2.5 w-full">
                <p className="mt-[-1.00px] font-p-l font-[number:var(--p-l-font-weight)] text-dark-grey text-[length:var(--p-l-font-size)] tracking-[var(--p-l-letter-spacing)] leading-[var(--p-l-line-height)] whitespace-nowrap [font-style:var(--p-l-font-style)]">
                  {isViewingOtherUser
                    ? (treasuryUserInfo?.bio || "Welcome to this user's creative space.")
                    : (user?.bio || "Hello, welcome to my creative space. Design, travel, and everyday life.")}
                </p>
              </div>

              <div className="inline-flex items-center gap-[30px]">
                {(isViewingOtherUser ? treasuryUserInfo?.socialLinks : socialLinksData) &&
                 (isViewingOtherUser ? treasuryUserInfo?.socialLinks : socialLinksData).filter(link => link.linkUrl && link.linkUrl.trim()).map((link, index) => (
                  <a
                    key={link.id || index}
                    href={link.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 p-0 h-auto hover:opacity-80 transition-opacity duration-200"
                  >
                    <div className="gap-[5px] inline-flex items-center">
                      <img
                        className="w-5 h-5"
                        alt={`${link.title} logo`}
                        src={link.iconUrl || "https://c.animaapp.com/mftam89xRJwsqQ/img/logo-wrap.svg"}
                        onError={(e) => {
                          e.currentTarget.src = "https://c.animaapp.com/mftam89xRJwsqQ/img/logo-wrap.svg";
                        }}
                      />

                      <span className="mt-[-1.00px] font-p-l font-[number:var(--p-l-font-weight)] text-dark-grey text-[length:var(--p-l-font-size)] tracking-[var(--p-l-letter-spacing)] leading-[var(--p-l-line-height)] whitespace-nowrap [font-style:var(--p-l-font-style)]">
                        {link.title}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col items-start gap-[30px] w-full mb-[-42.00px]">
        <Tabs value={activeTab} onValueChange={(value) => {
          // Update URL with new tab parameter
          const newSearchParams = new URLSearchParams(searchParams);
          if (value === 'collection') {
            newSearchParams.delete('tab'); // Remove tab param for default
          } else {
            newSearchParams.set('tab', value);
          }
          const newUrl = `${window.location.pathname}?${newSearchParams.toString()}`;
          navigate(newUrl, { replace: true });
        }} className="w-full">
          <TabsList className="flex items-center justify-between w-full bg-transparent h-auto p-0 rounded-none relative border-b border-[#ffffff]">
            <TabsTrigger
              value="collection"
              className="flex-1 flex items-center justify-center bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none p-0 relative data-[state=active]:after:content-[''] data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-1/2 data-[state=active]:after:transform data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:w-[calc(100%-30px)] data-[state=active]:after:h-[2px] data-[state=active]:after:bg-[#454545]"
            >
              <div className="inline-flex items-center justify-center px-[15px] py-2.5">
                <span className="mt-[-1.00px] [font-family:'Lato',Helvetica] data-[state=active]:font-bold font-normal text-dark-grey data-[state=active]:text-lg text-lg text-center tracking-[0] leading-[25.2px] whitespace-nowrap">
                  {isViewingOtherUser ? `${treasuryUserInfo?.username || 'User'}'s collection` : 'My collection'}
                </span>
              </div>
            </TabsTrigger>

            <TabsTrigger
              value="share"
              className={`${!isViewingOtherUser ? 'flex-1' : 'flex-1'} flex items-center justify-center bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none p-0 relative data-[state=active]:after:content-[''] data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-1/2 data-[state=active]:after:transform data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:w-[calc(100%-30px)] data-[state=active]:after:h-[2px] data-[state=active]:after:bg-[#454545]`}
            >
              <div className="justify-center px-[15px] py-2.5 w-full flex items-center gap-2.5">
                <span className="mt-[-1.00px] [font-family:'Lato',Helvetica] data-[state=active]:font-bold font-normal text-dark-grey data-[state=active]:text-lg text-lg text-center tracking-[0] leading-[25.2px] whitespace-nowrap">
                  {isViewingOtherUser ? `${treasuryUserInfo?.username || 'User'}'s share` : 'My share'}
                </span>
              </div>
            </TabsTrigger>

            {/* 已解锁内容标签页 - 只在查看自己页面时显示 */}
            {!isViewingOtherUser && (
              <TabsTrigger
                value="unlocked"
                className="flex-1 flex items-center justify-center bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none p-0 relative data-[state=active]:after:content-[''] data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-1/2 data-[state=active]:after:transform data-[state=active]:after:-translate-x-1/2 data-[state=active]:after:w-[calc(100%-30px)] data-[state=active]:after:h-[2px] data-[state=active]:after:bg-[#454545]"
              >
                <div className="justify-center px-[15px] py-2.5 w-full flex items-center gap-2.5">
                  <span className="mt-[-1.00px] [font-family:'Lato',Helvetica] data-[state=active]:font-bold font-normal text-dark-grey data-[state=active]:text-lg text-lg text-center tracking-[0] leading-[25.2px] whitespace-nowrap">
                    🔓 已解锁内容
                    {unlockedContent.length > 0 && (
                      <span className="ml-2 bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full">
                        {unlockedContent.length}
                      </span>
                    )}
                  </span>
                </div>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="collection" className="mt-[30px]">
            {likedArticlesLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-lg text-gray-600">Loading collection...</div>
              </div>
            ) : likedArticlesError ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-lg text-red-600">Loading failed: {likedArticlesError}</div>
              </div>
            ) : likedArticles.length > 0 ? (
              <div className="w-full grid grid-cols-1 lg:grid-cols-[repeat(auto-fill,minmax(408px,1fr))] gap-8">
                {likedArticles.map((article) => {
                  const card = transformLikedApiToCard(article);
                  return renderCard(card);
                })}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center py-20 gap-4">
                <div className="text-lg text-gray-600">
                  {isViewingOtherUser ? 'This user has no treasured content yet' : 'No treasured content yet'}
                </div>
                <div className="text-sm text-gray-400">
                  {isViewingOtherUser ? 'No public treasured content available' : 'Discover and treasure some amazing content!'}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="share" className="mt-[30px]">
            {createdArticlesLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-lg text-gray-600">Loading shared content...</div>
              </div>
            ) : createdArticlesError ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-lg text-red-600">Loading failed: {createdArticlesError}</div>
              </div>
            ) : createdArticles.length > 0 ? (
              <div className="w-full grid grid-cols-1 lg:grid-cols-[repeat(auto-fill,minmax(408px,1fr))] gap-8">
                {createdArticles.map((article) => {
                  const card = transformCreatedApiToCard(article);
                  return renderMyShareCard(card);
                })}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center py-20 gap-4">
                <div className="text-lg text-gray-600">
                  {isViewingOtherUser ? 'This user has no shared content yet' : 'No shared content yet'}
                </div>
                <div className="text-sm text-gray-400">
                  {isViewingOtherUser ? 'No public shared content available' : 'Start sharing some amazing content!'}
                </div>
              </div>
            )}
          </TabsContent>

          {/* 已解锁内容标签页内容 - 只在查看自己页面时显示 */}
          {!isViewingOtherUser && (
            <TabsContent value="unlocked" className="mt-[30px]">
              {unlockedContent.length > 0 ? (
                <div className="w-full grid grid-cols-1 lg:grid-cols-[repeat(auto-fill,minmax(408px,1fr))] gap-8">
                  {unlockedContent.map((content) => (
                    <div key={content.id} className="relative">
                      <ArticleCard
                        article={content}
                        layout="treasury"
                        actions={{
                          showTreasure: true,
                          showVisits: true,
                          showWebsite: true,
                          showBranchIt: true
                        }}
                        onLike={(articleId, currentIsLiked, currentLikeCount) =>
                          toggleLike(articleId, currentIsLiked, currentLikeCount)
                        }
                        onUserClick={(userId) => {
                          // 对于付费内容，暂时不支持点击用户头像
                        }}
                      />
                      {/* 已解锁标识 */}
                      <div className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm">
                        <span>✅</span>
                        <span>已解锁</span>
                      </div>
                      {/* 解锁信息 */}
                      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-gray-600">
                        💰 {content.price || 'N/A'} {content.currency || 'USD'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 mb-4 flex items-center justify-center">
                    <span className="text-4xl opacity-50">🔒</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">还没有解锁任何内容</h3>
                  <p className="text-gray-500 mb-4">购买付费内容后，它们就会出现在这里</p>
                  <a
                    href="/"
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    探索付费内容
                  </a>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </section>

      <div className="h-[50px]" />

      {/* 删除确认对话框 */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="inline-flex flex-col items-center justify-center gap-10 pt-[100px] pb-[50px] px-10 bg-white rounded-[15px] relative shadow-lg">
            <button
              className="absolute right-6 top-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
              onClick={() => {
                setDeleteDialogOpen(false);
                setArticleToDelete(null);
              }}
              disabled={isDeleting}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </button>

            <div className="inline-flex flex-col items-center justify-center gap-[30px] px-[30px] py-0 relative flex-[0_0_auto]">
              <div className="inline-flex flex-col items-center justify-center gap-[25px] relative flex-[0_0_auto]">
                <h1 className="relative w-[400px] mt-[-1.00px] font-h3-s font-[number:var(--h3-s-font-weight)] text-off-black text-[length:var(--h3-s-font-size)] text-center tracking-[var(--h3-s-letter-spacing)] leading-[var(--h3-s-line-height)] [font-style:var(--h3-s-font-style)]">
                  Are you sure to delete this curated link?
                </h1>
              </div>

              <div className="inline-flex items-center justify-center gap-[15px] relative flex-[0_0_auto]">
                <Button
                  variant="ghost"
                  className="inline-flex h-[45px] items-center justify-center gap-[30px] px-[30px] py-2.5 relative flex-[0_0_auto] rounded-[15px] h-auto hover:bg-transparent"
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setArticleToDelete(null);
                  }}
                  disabled={isDeleting}
                >
                  <span className="relative w-fit mt-[-3.50px] font-h-4 font-[number:var(--h-4-font-weight)] text-dark-grey text-[length:var(--h-4-font-size)] tracking-[var(--h-4-letter-spacing)] leading-[var(--h-4-line-height)] whitespace-nowrap [font-style:var(--h-4-font-style)]">
                    Cancel
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="inline-flex h-[45px] items-center justify-center gap-[15px] px-[30px] py-2.5 relative flex-[0_0_auto] rounded-[50px] border border-solid border-[#f23a00] bg-transparent text-red hover:bg-red hover:text-white h-auto transition-colors"
                  onClick={handleDeleteArticle}
                  disabled={isDeleting}
                >
                  <span className="relative w-fit mt-[-2.50px] mb-[-0.50px] [font-family:'Lato',Helvetica] font-semibold text-xl tracking-[0] leading-7 whitespace-nowrap">
                    {isDeleting ? "Deleting..." : "Yes"}
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 简单直接的图片预览模态框 */}
      {showImagePreview && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => {
            setShowImagePreview(false);
            setPreviewImageUrl('');
            setPreviewImageAlt('');
          }}
        >
          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowImagePreview(false);
              setPreviewImageUrl('');
              setPreviewImageAlt('');
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              fontSize: '20px',
              cursor: 'pointer',
              zIndex: 1000000
            }}
          >
            ×
          </button>

          {/* Image */}
          <img
            src={previewImageUrl}
            alt={previewImageAlt}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '400px',
              maxHeight: '400px',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              border: '4px solid white'
            }}
          />

          {/* Hint text */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px'
          }}>
            点击空白区域或按ESC关闭
          </div>
        </div>
      )}

    </div>
  );
};
