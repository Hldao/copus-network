import React, { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { UploadIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { HeaderSection } from "../../components/shared/HeaderSection/HeaderSection";
import { SideMenuSection } from "../../components/shared/SideMenuSection/SideMenuSection";
import { useUser } from "../../contexts/UserContext";
import { useCategory } from "../../contexts/CategoryContext";
import { useToast } from "../../components/ui/toast";
import { PaperPlane } from "../../components/ui/copus-loading";
import { AuthService } from "../../services/authService";
import { publishArticle, getArticleDetail } from "../../services/articleService";
import { useNavigate } from "react-router-dom";
import { getCategoryStyle, getCategoryInlineStyle } from "../../utils/categoryStyles";
import { ArticleCard, ArticleData } from "../../components/ArticleCard";
import { ImageCropper } from "../../components/ImageCropper/ImageCropper";
import { validateImageFile, compressImage, createImagePreview, revokeImagePreview } from "../../utils/imageUtils";
import { addRecentCategory, sortCategoriesByRecent } from "../../utils/recentCategories";
import profileDefaultAvatar from "../../assets/images/profile-default.svg";
import { CreatorPricingPanel, PricingData } from "../../components/ui/CreatorPricingPanel";


export const Create = (): JSX.Element => {
  const { user, isLoggedIn } = useUser();
  const { categories, categoriesLoading } = useCategory();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  // Check if in edit mode
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string>("");

  const [formData, setFormData] = useState({
    link: "",
    title: "",
    recommendation: "",
    selectedTopic: "生活", // Default to Chinese category
    selectedTopicId: 1, // Corresponding ID
    coverImage: null as File | null,
    // x402 付费内容相关字段
    isPremium: false,
    price: "",
    currency: "USDC",
    network: "ethereum"
  });

  const [characterCount, setCharacterCount] = useState(0);
  const [titleCharacterCount, setTitleCharacterCount] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [linkValidation, setLinkValidation] = useState({ isValid: true, message: '' });
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);

  // Image cropping states
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [showImageCropper, setShowImageCropper] = useState(false);

  // Sort categories to show recently used ones first
  const sortedCategories = useMemo(() => {
    return sortCategoriesByRecent(categories);
  }, [categories]);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Extract domain from URL for display
  const extractDomain = (url: string): string => {
    if (!url.trim()) return "your-link.com";

    // Check for IPFS links
    if (url.startsWith('ipfs://')) {
      const hash = url.replace('ipfs://', '').split('/')[0];
      return `ipfs://${hash.substring(0, 12)}...`;
    }

    // Check for Arweave links
    if (url.startsWith('ar://')) {
      const hash = url.replace('ar://', '').split('/')[0];
      return `ar://${hash.substring(0, 12)}...`;
    }

    try {
      // Add protocol if missing for standard URLs
      const urlWithProtocol = url.match(/^(https?|ipfs|ar):\/\//i) ? url : `https://${url}`;
      const urlObj = new URL(urlWithProtocol);

      if (urlObj.protocol === 'ipfs:') {
        return `ipfs://${urlObj.hostname.substring(0, 12)}...`;
      }
      if (urlObj.protocol === 'ar:') {
        return `ar://${urlObj.hostname.substring(0, 12)}...`;
      }

      return urlObj.hostname;
    } catch (error) {
      // If URL parsing fails, try to extract domain manually
      const cleaned = url.replace(/^(https?|ipfs|ar):\/\//i, '').split('/')[0].split('?')[0];
      return cleaned || "your-link.com";
    }
  };

  // URL validation function
  const validateUrl = (url: string): { isValid: boolean; message: string } => {
    if (!url.trim()) {
      return { isValid: true, message: '' }; // Empty is OK, handled by required validation
    }

    // Check for IPFS links (ipfs:// or gateway URLs)
    if (url.startsWith('ipfs://')) {
      const hash = url.replace('ipfs://', '').split('/')[0];
      // Basic IPFS hash validation (CID v0 or v1)
      if (hash.length > 0 && (hash.startsWith('Qm') || hash.startsWith('baf'))) {
        return { isValid: true, message: '' };
      }
      return { isValid: false, message: 'Please enter a valid IPFS hash' };
    }

    // Check for Arweave links
    if (url.startsWith('ar://')) {
      const hash = url.replace('ar://', '').split('/')[0];
      // Basic Arweave transaction ID validation (43 characters)
      if (hash.length >= 43) {
        return { isValid: true, message: '' };
      }
      return { isValid: false, message: 'Please enter a valid Arweave transaction ID' };
    }

    // Check if input is just numbers or obviously invalid
    const trimmedUrl = url.trim();
    if (/^\d+$/.test(trimmedUrl)) {
      return { isValid: false, message: 'Please enter a valid website address, not just numbers' };
    }

    // Check for common invalid patterns
    if (trimmedUrl.length < 3) {
      return { isValid: false, message: 'Please enter a valid website address' };
    }

    // Check if it looks like a valid domain pattern (before adding protocol)
    const urlWithoutProtocol = trimmedUrl.replace(/^https?:\/\//i, '');
    // Extract just the hostname part (before any path, query, or fragment)
    const hostnameOnly = urlWithoutProtocol.split('/')[0].split('?')[0].split('#')[0];
    // Use a simpler, more robust regex for hostname validation
    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(hostnameOnly) && hostnameOnly !== 'localhost') {
      return { isValid: false, message: 'Please enter a valid website address (e.g., example.com)' };
    }

    try {
      // Try to create URL object - this validates basic URL structure
      const urlWithProtocol = url.match(/^https?:\/\//i) ? url : `https://${url}`;
      const urlObj = new URL(urlWithProtocol);

      // Check for valid protocols
      if (!['http:', 'https:', 'ipfs:', 'ar:'].includes(urlObj.protocol)) {
        return { isValid: false, message: 'URL must use http://, https://, ipfs://, or ar://' };
      }

      // Check for valid hostname (skip for IPFS/Arweave)
      if (['http:', 'https:'].includes(urlObj.protocol)) {
        if (!urlObj.hostname || urlObj.hostname.length < 3) {
          return { isValid: false, message: 'Please enter a valid website address' };
        }

        // Check if hostname contains at least one dot (domain structure)
        // But allow localhost for development
        if (!urlObj.hostname.includes('.') && urlObj.hostname !== 'localhost') {
          return { isValid: false, message: 'Please enter a valid website address (e.g., example.com)' };
        }

        // Additional check: ensure hostname is not just numbers
        if (/^\d+$/.test(urlObj.hostname)) {
          return { isValid: false, message: 'Please enter a valid website address, not an IP address' };
        }

        // Check for valid TLD (at least 2 characters after the last dot)
        const parts = urlObj.hostname.split('.');
        if (parts.length < 2 || parts[parts.length - 1].length < 2) {
          return { isValid: false, message: 'Please enter a valid website address with a proper domain extension' };
        }
      }

      return { isValid: true, message: '' };
    } catch (error) {
      return { isValid: false, message: 'Please enter a valid URL (http://, https://, ipfs://, or ar://)' };
    }
  };

  const selectedCategoryData = categories.find(cat => cat.name === formData.selectedTopic) || categories[0];
  const selectedCategoryStyle = getCategoryStyle(formData.selectedTopic, selectedCategoryData?.color);

  // Create preview article data
  const previewArticleData: ArticleData = {
    id: 'preview',
    title: formData.title || 'Enter a title...',
    description: formData.recommendation || 'Write your recommendation...',
    coverImage: formData.coverImage
      ? URL.createObjectURL(formData.coverImage)
      : coverImageUrl || '',
    category: formData.selectedTopic,
    categoryColor: selectedCategoryData?.color,
    userName: user?.username || 'Guest User',
    userAvatar: user?.faceUrl || profileDefaultAvatar,
    userId: user?.id,
    namespace: user?.namespace,
    date: new Date().toISOString(),
    treasureCount: 0,
    visitCount: "0 Visits",
    website: extractDomain(formData.link),
    // 付费内容预览
    isPremium: formData.isPremium,
    price: formData.price,
    currency: formData.currency,
    isUnlocked: false, // 预览时显示为未解锁状态
    previewContent: formData.isPremium ? '点击解锁查看目标链接内容' : undefined
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === "title") {
      // Limit title to 75 characters
      if (value.length <= 75) {
        setFormData(prev => ({ ...prev, [field]: value }));
        setTitleCharacterCount(value.length);
      }
    } else if (field === "recommendation") {
      // Limit recommendation to 1000 characters
      if (value.length <= 1000) {
        setFormData(prev => ({ ...prev, [field]: value }));
        setCharacterCount(value.length);
      }
    } else if (field === "link") {
      // Limit URL to 255 characters (common database field limit)
      if (value.length <= 255) {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Validate URL as user types (with debounce effect)
        setTimeout(() => {
          const validation = validateUrl(value);
          setLinkValidation(validation);
        }, 500);
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleTopicSelect = (topicName: string, topicId: number) => {
    setFormData(prev => ({ ...prev, selectedTopic: topicName, selectedTopicId: topicId }));
    // Track this category as recently used
    addRecentCategory(topicId, topicName);
  };

  // 处理付费设置变更
  const handlePricingChange = (pricingData: PricingData) => {
    setFormData(prev => ({
      ...prev,
      isPremium: pricingData.isPremium,
      price: pricingData.price,
      currency: pricingData.currency,
      network: pricingData.network
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      showToast(validation.error || 'File format not supported', 'error');
      return;
    }

    setSelectedImageFile(file);
    const preview = createImagePreview(file);
    setImagePreviewUrl(preview);
    setShowImageCropper(true);
  };

  const handleImageCrop = async (croppedFile: File) => {
    try {
      setShowImageCropper(false);

      // Compress image
      const compressedFile = await compressImage(croppedFile, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
        format: 'jpeg'
      });

      setFormData(prev => ({ ...prev, coverImage: compressedFile }));

      // Clean up preview
      if (imagePreviewUrl) {
        revokeImagePreview(imagePreviewUrl);
        setImagePreviewUrl('');
      }
      setSelectedImageFile(null);
    } catch (error) {
      console.error('Image processing failed:', error);
      showToast('Image processing failed, please try again', 'error');
    }
  };

  const handleCancelImageCrop = () => {
    setShowImageCropper(false);
    if (imagePreviewUrl) {
      revokeImagePreview(imagePreviewUrl);
      setImagePreviewUrl('');
    }
    setSelectedImageFile(null);
  };

  // Generate unique ID
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Set default selected category when category data is loaded
  useEffect(() => {
    if (sortedCategories && sortedCategories.length > 0) {
      // If current selected category is not in list, select the first one (most recently used)
      const currentCategoryExists = sortedCategories.some(cat => cat.name === formData.selectedTopic);
      if (!currentCategoryExists) {
        setFormData(prev => ({
          ...prev,
          selectedTopic: sortedCategories[0].name,
          selectedTopicId: sortedCategories[0].id
        }));
      }
    }
  }, [sortedCategories]);

  // Edit mode: Load article data
  useEffect(() => {
    const loadArticleForEdit = async () => {
      if (!isEditMode || !editId) return;

      setIsLoadingArticle(true);
      try {
        const articleData = await getArticleDetail(editId);

        // Set article data
        setEditingArticle(articleData);

        // Fill form data
        setFormData({
          link: articleData.targetUrl || "",
          title: articleData.title || "",
          recommendation: articleData.content || "",
          selectedTopic: articleData.categoryInfo?.name || "生活",
          selectedTopicId: articleData.categoryInfo?.id || 1,
          coverImage: null, // Don't load image file directly in edit mode
        });

        // Set cover image URL for display
        setCoverImageUrl(articleData.coverUrl || "");
        setCharacterCount(articleData.content?.length || 0);
        setTitleCharacterCount(articleData.title?.length || 0);

      } catch (error) {
        console.error('Failed to load article data:', error);
        showToast('Failed to load article data, please try again', 'error');
        navigate('/my-treasury');
      } finally {
        setIsLoadingArticle(false);
      }
    };

    loadArticleForEdit();
  }, [isEditMode, editId, navigate, showToast]);

  // Publish article
  const handlePublish = async () => {
    // Basic validation - including cover image
    if (!formData.link || !formData.title || !formData.recommendation) {
      showToast('Please fill in all required fields (link, title, recommendation)', 'error');
      return;
    }

    // URL validation
    const urlValidation = validateUrl(formData.link);
    if (!urlValidation.isValid) {
      showToast(`Invalid URL: ${urlValidation.message}`, 'error');
      setLinkValidation(urlValidation);
      return;
    }

    // In edit mode, allow if no new image uploaded but original cover URL exists
    if (!isEditMode && !formData.coverImage) {
      showToast('Please upload a cover image', 'error');
      return;
    }

    if (isEditMode && !formData.coverImage && !coverImageUrl) {
      showToast('Please upload a cover image', 'error');
      return;
    }

    setIsPublishing(true);

    try {
      let finalCoverUrl = coverImageUrl; // Default to existing cover URL (edit mode)

      // If new image uploaded, upload to S3
      if (formData.coverImage) {
        try {
          showToast('Uploading image...', 'info');

          const uploadResult = await AuthService.uploadImage(formData.coverImage);
          finalCoverUrl = uploadResult.url;

          showToast('Image uploaded successfully!', 'success');
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          showToast(`Image upload failed: ${uploadError.message || 'Please try again'}`, 'error');
          setIsPublishing(false);
          return;
        }
      }

      // Prepare API parameters - smart URL handling
      const processedUrl = formData.link.trim();
      let finalUrl = processedUrl;

      // If URL has no protocol prefix, add https:// (but preserve IPFS and Arweave protocols)
      if (!/^(https?|ipfs|ar):\/\//i.test(processedUrl)) {
        finalUrl = `https://${processedUrl}`;
      }

      // Validate field lengths before sending
      const fieldValidation = {
        title: formData.title.length,
        content: formData.recommendation.length,
        targetUrl: finalUrl.length,
        coverUrl: finalCoverUrl.length
      };

      console.log('📏 Field lengths:', fieldValidation);

      // Check if any field exceeds limits
      if (formData.title.length > 75) {
        throw new Error(`Title too long: ${formData.title.length} characters (max 75)`);
      }
      if (formData.recommendation.length > 1000) {
        throw new Error(`Recommendation too long: ${formData.recommendation.length} characters (max 1000)`);
      }
      if (finalUrl.length > 255) {
        throw new Error(`URL too long: ${finalUrl.length} characters (max 255)`);
      }
      if (finalCoverUrl.length > 500) {
        throw new Error(`Cover URL too long: ${finalCoverUrl.length} characters (max 500)`);
      }

      const articleParams = {
        ...(isEditMode && editId ? { uuid: editId } : {}), // Add uuid in edit mode
        categoryId: formData.selectedTopicId,
        content: formData.recommendation.substring(0, 1000), // Ensure max 1000 chars
        coverUrl: finalCoverUrl.substring(0, 500), // Ensure max 500 chars
        targetUrl: finalUrl.substring(0, 255), // Ensure max 255 chars
        title: formData.title.substring(0, 75), // Ensure max 75 chars
      };

      console.log('📤 Sending article params:', articleParams);
      console.log('📤 Detailed params:', {
        title: `"${articleParams.title}" (${articleParams.title.length} chars)`,
        content: `"${articleParams.content}" (${articleParams.content.length} chars)`,
        targetUrl: `"${articleParams.targetUrl}" (${articleParams.targetUrl.length} chars)`,
        coverUrl: `"${articleParams.coverUrl}" (${articleParams.coverUrl.length} chars)`,
        categoryId: articleParams.categoryId
      });

      const response = await publishArticle(articleParams);
      console.log('✅ Publish response:', response);
      console.log('✅ Response type:', typeof response);

      showToast(isEditMode ? 'Article updated successfully!' : 'Article published successfully!', 'success');

      // The API returns the UUID as a string directly in response.data
      // So publishArticle returns the UUID string, not an object
      let articleUuid: string | null = null;

      if (typeof response === 'string') {
        // Response is the UUID string directly
        articleUuid = response;
      } else if (response?.uuid) {
        // Response is an object with uuid property
        articleUuid = response.uuid;
      } else if (editId) {
        // Fallback to editId in edit mode
        articleUuid = editId;
      }

      console.log('✅ Article UUID for redirect:', articleUuid);

      // Always redirect to the work page if we have a UUID
      if (articleUuid) {
        console.log(`✅ Redirecting to /work/${articleUuid}`);
        setTimeout(() => {
          console.log(`🚀 Now navigating to /work/${articleUuid}`);
          navigate(`/work/${articleUuid}`);
        }, 1500);
      } else {
        // This should rarely happen
        console.error('❌ No UUID found in response');
        console.error('Response was:', response);
        showToast('Article published but could not navigate to it. Please check My Treasury.', 'warning');
        setTimeout(() => {
          navigate('/my-treasury');
        }, 1500);
      }

    } catch (error) {
      console.error('❌ Article publishing failed:', error);

      // Extract more detailed error message
      let errorMessage = 'Article publishing failed';
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      } else if (typeof error === 'object' && error !== null && 'msg' in error) {
        errorMessage = (error as any).msg;
      }

      // Show more specific error message
      showToast(errorMessage || 'Article publishing failed, please try again', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[linear-gradient(0deg,rgba(224,224,224,0.18)_0%,rgba(224,224,224,0.18)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]">
      <HeaderSection isLoggedIn={isLoggedIn} hideCreateButton={true} />
      <SideMenuSection activeItem="create" />
      <div className="lg:ml-[360px] lg:mr-[70px] min-h-screen overflow-y-auto pt-[70px] lg:pt-[120px]">
        <div className="flex flex-col items-start gap-[30px] px-5 md:px-8 lg:px-12 xl:px-20 2xl:px-40 py-0 pb-[100px] w-full">
          <div className="flex items-center gap-2.5 w-full">
            <h1 className="relative w-fit mt-[-1.00px] font-h-3 font-[number:var(--h-3-font-weight)] text-[#231f20] text-[length:var(--h-3-font-size)] text-center tracking-[var(--h-3-letter-spacing)] leading-[var(--h-3-line-height)] whitespace-nowrap [font-style:var(--h-3-font-style)]">
              {isEditMode ? 'Edit treasure' : 'Share treasure'}
            </h1>
            {isEditMode && (
              <span className="text-sm text-gray-500 ml-2">
                (Edit Mode)
              </span>
            )}
            <div className="ml-[10px]">
              <Button
                variant="outline"
                className="flex items-center px-5 py-2.5 h-auto rounded-[50px] border-red text-red hover:bg-[#F23A001A] hover:text-red transition-colors duration-200"
                asChild
              >
                <a href="#" target="_blank" rel="noopener noreferrer">
                  <span className="[font-family:'Lato',Helvetica] font-bold text-lg leading-5 text-red whitespace-nowrap">
                    Install browser extension
                  </span>
                </a>
              </Button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-start gap-[30px] lg:gap-[30px] xl:gap-[60px] w-full">
            <div className="flex flex-col items-start gap-[30px] pl-0 lg:pr-[30px] xl:pr-[60px] py-0 flex-1 lg:border-r lg:[border-right-style:solid] lg:border-light-grey w-full">
            <div className="flex flex-col items-start gap-2.5 w-full">
              <div className="flex flex-col w-[60px] h-[23px] items-start justify-center gap-2.5">
                <label className="relative flex items-center justify-center w-fit mt-[-2.00px] font-p-l font-[number:var(--p-l-font-weight)] text-transparent text-[length:var(--p-l-font-size)] tracking-[var(--p-l-letter-spacing)] leading-[var(--p-l-line-height)] whitespace-nowrap [font-style:var(--p-l-font-style)]">
                  <span className="text-[#f23a00] font-p-l [font-style:var(--p-l-font-style)] font-[number:var(--p-l-font-weight)] tracking-[var(--p-l-letter-spacing)] leading-[var(--p-l-line-height)] text-[length:var(--p-l-font-size)]">
                    *
                  </span>
                  <span className="text-[#686868] font-p-l [font-style:var(--p-l-font-style)] font-[number:var(--p-l-font-weight)] tracking-[var(--p-l-letter-spacing)] leading-[var(--p-l-line-height)] text-[length:var(--p-l-font-size)]">
                    Link
                  </span>
                </label>
              </div>

              <div className={`flex items-center px-[15px] py-2.5 w-full bg-white rounded-[15px] border border-solid transition-all ${
                !linkValidation.isValid ? 'border-red shadow-sm' :
                focusedField === 'link' ? 'border-red shadow-sm' : 'border-light-grey'
              }`}>
                <input
                  type="text"
                  value={formData.link}
                  onChange={(e) => handleInputChange("link", e.target.value)}
                  onFocus={() => setFocusedField('link')}
                  onBlur={() => setFocusedField(null)}
                  className="flex-1 [font-family:'Lato',Helvetica] font-normal text-dark-grey text-lg tracking-[0] leading-5 placeholder:text-medium-grey border-0 bg-transparent focus:outline-none"
                  placeholder="Enter or paste your link here (http://, https://, ipfs://, ar://)..."
                  aria-label="Link URL"
                  maxLength={255}
                />
              </div>

              {/* URL Validation Message */}
              {!linkValidation.isValid && formData.link && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-red text-sm">⚠</span>
                  <span className="text-red text-sm">{linkValidation.message}</span>
                </div>
              )}

              {/* URL Format Helper */}
              {linkValidation.isValid && formData.link && (
                <div className="flex items-center justify-between w-full mt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-green text-sm">✓</span>
                    <span className="text-green text-sm">Valid URL</span>
                  </div>
                  <span className="text-medium-grey text-xs">{formData.link.length}/255</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-start gap-2.5 w-full">
              <div className="flex items-center justify-between w-full">
                <label className="relative w-[60px] mt-[-1.00px] [font-family:'Lato',Helvetica] font-normal text-transparent text-base tracking-[0] leading-4">
                  <span className="text-[#f23a00] leading-[var(--p-line-height)] font-p [font-style:var(--p-font-style)] font-[number:var(--p-font-weight)] tracking-[var(--p-letter-spacing)] text-[length:var(--p-font-size)]">
                    *
                  </span>
                  <span className="text-[#686868] text-[length:var(--p-l-font-size)] leading-[var(--p-l-line-height)] font-p-l [font-style:var(--p-l-font-style)] font-[number:var(--p-l-font-weight)] tracking-[var(--p-l-letter-spacing)]">
                    Title
                  </span>
                </label>
                <span className="[font-family:'Lato',Helvetica] font-normal text-medium-grey text-sm">
                  {titleCharacterCount}/75
                </span>
              </div>

              <div className={`flex items-start gap-[5px] px-[15px] py-2.5 w-full bg-white rounded-[15px] border border-solid transition-all ${
                focusedField === 'title' ? 'border-red shadow-sm' : 'border-light-grey'
              }`}>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  onFocus={() => setFocusedField('title')}
                  onBlur={() => setFocusedField(null)}
                  className="relative w-full mt-[-1.00px] [font-family:'Lato',Helvetica] font-semibold text-dark-grey text-lg tracking-[0] leading-[23.4px] placeholder:text-medium-grey placeholder:font-normal border-0 bg-transparent focus:outline-none"
                  placeholder="Enter title..."
                  aria-label="Title"
                  maxLength={75}
                />
              </div>
            </div>

            <div className="flex flex-col items-start gap-2.5 w-full">
              <div className="flex w-[60px] items-center gap-2.5">
                <label className="items-center justify-center w-fit mt-[-1.00px] font-p-l font-[number:var(--p-l-font-weight)] text-transparent text-[length:var(--p-l-font-size)] tracking-[var(--p-l-letter-spacing)] leading-[var(--p-l-line-height)] whitespace-nowrap relative flex [font-style:var(--p-l-font-style)]">
                  <span className="text-[#f23a00] font-p-l [font-style:var(--p-l-font-style)] font-[number:var(--p-l-font-weight)] tracking-[var(--p-l-letter-spacing)] leading-[var(--p-l-line-height)] text-[length:var(--p-l-font-size)]">
                    *
                  </span>
                  <span className="text-[#686868] font-p-l [font-style:var(--p-l-font-style)] font-[number:var(--p-l-font-weight)] tracking-[var(--p-l-letter-spacing)] leading-[var(--p-l-line-height)] text-[length:var(--p-l-font-size)]">
                    Cover
                  </span>
                </label>
              </div>

              <div
                className={`relative w-full max-w-[400px] h-[225px] border border-dashed cursor-pointer transition-all rounded-lg ${
                  formData.coverImage || coverImageUrl
                    ? 'border-green-400 bg-cover bg-[50%_50%]'
                    : 'border-medium-grey hover:border-dark-grey bg-gray-50'
                }`}
                style={{
                  backgroundImage: formData.coverImage
                    ? `url(${URL.createObjectURL(formData.coverImage)})`
                    : coverImageUrl
                    ? `url(${coverImageUrl})`
                    : 'none'
                }}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      handleImageUpload({ target: { files: [file] } } as any);
                    }
                  };
                  input.click();
                }}
              >
                {!formData.coverImage && !coverImageUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <p className="text-medium-grey text-lg font-medium mb-2">Click to upload cover image</p>
                    <p className="text-medium-grey text-sm">Supports JPG, PNG formats</p>
                  </div>
                )}
                {isEditMode && coverImageUrl && !formData.coverImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-30 transition-all">
                    <div className="opacity-0 hover:opacity-100 text-white text-center">
                      <p className="text-lg font-medium">Click to change cover image</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-start gap-2.5 w-full">
              <label className="relative w-fit mt-[-1.00px] [font-family:'Lato',Helvetica] font-normal text-transparent text-base tracking-[0] leading-4">
                <span className="text-[#f23a00] leading-[var(--p-line-height)] font-p [font-style:var(--p-font-style)] font-[number:var(--p-font-weight)] tracking-[var(--p-letter-spacing)] text-[length:var(--p-font-size)]">
                  *
                </span>
                <span className="text-[#686868] text-[length:var(--p-l-font-size)] leading-[var(--p-l-line-height)] font-p-l [font-style:var(--p-l-font-style)] font-[number:var(--p-l-font-weight)] tracking-[var(--p-l-letter-spacing)]">
                  Recommendation
                </span>
              </label>

              <div className={`flex flex-col h-44 items-start justify-between px-[15px] py-2.5 w-full bg-white rounded-[15px] border border-solid transition-all ${
                focusedField === 'recommendation' ? 'border-red shadow-sm' : 'border-light-grey'
              }`}>
                <textarea
                  value={formData.recommendation}
                  onChange={(e) => handleInputChange("recommendation", e.target.value)}
                  onFocus={() => setFocusedField('recommendation')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Please describe why you recommend this link..."
                  className="relative self-stretch flex-1 resize-none font-p-l font-[number:var(--p-l-font-weight)] text-dark-grey text-[length:var(--p-l-font-size)] tracking-[var(--p-l-letter-spacing)] leading-[var(--p-l-line-height)] [font-style:var(--p-l-font-style)] placeholder:text-medium-grey border-0 bg-transparent focus:outline-none"
                  aria-label="Recommendation"
                  maxLength={1000}
                />
                <div className="relative self-stretch [font-family:'Lato',Helvetica] font-normal text-medium-grey text-sm text-right tracking-[0] leading-[25px]">
                  {characterCount}/1000
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start gap-2.5 w-full">
              <div className="relative w-fit mt-[-1.00px] font-p font-[number:var(--p-font-weight)] text-off-black text-[length:var(--p-font-size)] tracking-[var(--p-letter-spacing)] leading-[var(--p-line-height)] whitespace-nowrap [font-style:var(--p-font-style)]">
                Choose a topic {categoriesLoading && <span className="text-medium-grey">(Loading...)</span>}
              </div>

              <div className="gap-2.5 inline-flex items-start flex-wrap">
                {sortedCategories.map((category) => {
                  const categoryStyle = getCategoryStyle(category.name, category.color);
                  const categoryInlineStyle = getCategoryInlineStyle(category.color);
                  const isSelected = formData.selectedTopic === category.name;
                  const isHovered = hoveredCategory === category.id;
                  const showBackground = isSelected || isHovered;

                  // Create styles without background for default, with background for hover/selected
                  const borderOnlyStyle = category.color ? {
                    border: `1px solid ${categoryInlineStyle.color}`,
                    borderRadius: '50px',
                  } : undefined;

                  const withBackgroundStyle = category.color ? {
                    border: `1px solid ${categoryInlineStyle.color}`,
                    borderRadius: '50px',
                    background: categoryInlineStyle.background,
                  } : undefined;

                  return (
                    <Badge
                      key={category.id}
                      variant="outline"
                      className={`cursor-pointer transition-all inline-flex items-center gap-[5px] px-2.5 py-2 rounded-[50px] border w-fit focus:outline-none focus:ring-0 ${
                        category.color ? '' : `${categoryStyle.border} ${showBackground ? categoryStyle.bg : ''}`
                      }`}
                      style={showBackground ? withBackgroundStyle : borderOnlyStyle}
                      onClick={() => handleTopicSelect(category.name, category.id)}
                      onMouseEnter={() => setHoveredCategory(category.id)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleTopicSelect(category.name, category.id);
                        }
                      }}
                    >
                      <span
                        className={`[font-family:'Lato',Helvetica] font-semibold text-sm tracking-[0] leading-[14px] ${
                          category.color ? '' : categoryStyle.text
                        }`}
                        style={category.color ? { color: categoryInlineStyle.color } : undefined}
                      >
                        {category.name}
                      </span>
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>

          {/* x402 付费内容设置 */}
          <div className="w-full">
            <CreatorPricingPanel
              pricingData={{
                isPremium: formData.isPremium,
                price: formData.price,
                currency: formData.currency,
                network: formData.network
              }}
              onPricingChange={handlePricingChange}
            />
          </div>

          <div className="inline-flex flex-col items-start gap-5">
            <div className="flex w-[60px] items-center gap-2.5">
              <div className="relative flex items-center justify-center w-fit mt-[-1.00px] mr-[-4.00px] font-p-l font-[number:var(--p-l-font-weight)] text-medium-dark-grey text-[length:var(--p-l-font-size)] tracking-[var(--p-l-letter-spacing)] leading-[var(--p-l-line-height)] whitespace-nowrap [font-style:var(--p-l-font-style)]">
                Preview
              </div>
            </div>

            <div className="flex flex-col items-start gap-10 w-full">
              <div className="w-full max-w-[500px] lg:max-w-[350px] xl:max-w-[450px] 2xl:max-w-[500px]">
                <ArticleCard
                  article={previewArticleData}
                  layout="preview"
                  className="w-full"
                />
              </div>

              <div
                className="inline-flex items-center justify-center gap-[15px] px-10 py-[15px] bg-red rounded-[50px] cursor-pointer hover:bg-red/90 transition-colors w-full"
                onClick={!isPublishing && formData.link && formData.title && formData.recommendation && (formData.coverImage || coverImageUrl) && linkValidation.isValid ? handlePublish : undefined}
                style={{
                    opacity: isPublishing || !formData.link || !formData.title || !formData.recommendation || (!formData.coverImage && !coverImageUrl) || !linkValidation.isValid ? 0.5 : 1,
                    cursor: isPublishing || !formData.link || !formData.title || !formData.recommendation || (!formData.coverImage && !coverImageUrl) || !linkValidation.isValid ? 'not-allowed' : 'pointer'
                  }}
                >
                  <span className="[font-family:'Lato',Helvetica] font-bold text-white text-lg tracking-[0] leading-[27px] whitespace-nowrap">
                    {isPublishing ? (
                      <span className="flex items-center space-x-2">
                        <PaperPlane />
                        <span>{isEditMode ? 'Updating...' : 'Publishing...'}</span>
                      </span>
                    ) : (
                      isEditMode ? 'Update' : 'Publish'
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Cropper Modal */}
      {showImageCropper && selectedImageFile && (
        <ImageCropper
          image={selectedImageFile}
          aspectRatio={16 / 9}
          cropShape="rect"
          type="banner"
          onCrop={handleImageCrop}
          onCancel={handleCancelImageCrop}
        />
      )}
    </div>
  );
};
