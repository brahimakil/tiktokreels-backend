const { CustomError } = require('../lib/errors');

// Function to get instagram post ID from URL string
const getId = (url) => {
  const regex = /instagram.com\/(?:[A-Za-z0-9_.]+\/)?(p|reels|reel|stories)\/([A-Za-z0-9-_]+)/;
  const match = url.match(regex);
  return match && match[2] ? match[2] : null;
};

// Function to get instagram data from URL string using GraphQL API
const getInstagramGraphqlData = async (url) => {
  const igId = getId(url);
  if (!igId) {
    throw new CustomError("Invalid Instagram URL format", 400);
  }

  try {
    console.log(`🔍 Extracting post ID: ${igId}`);
    
    // Fetch graphql data from instagram post
    const graphql = new URL(`https://www.instagram.com/api/graphql`);
    graphql.searchParams.set("variables", JSON.stringify({ shortcode: igId }));
    graphql.searchParams.set("doc_id", "10015901848480474");
    graphql.searchParams.set("lsd", "AVqbxe3J_YA");

    console.log(`🌐 Making GraphQL request to Instagram...`);

    const response = await fetch(graphql, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        "X-IG-App-ID": "936619743392459", // Default App ID
        "X-FB-LSD": "AVqbxe3J_YA",
        "X-ASBD-ID": "129477",
        "Sec-Fetch-Site": "same-origin"
      }
    });

    if (!response.ok) {
      console.error(`❌ Instagram API error: ${response.status} ${response.statusText}`);
      throw new CustomError(`Instagram API responded with status: ${response.status}`, response.status);
    }

    const json = await response.json();
    console.log(`📊 GraphQL response received`);
    
    const items = json?.data?.xdt_shortcode_media;

    if (!items) {
      console.error(`❌ No media data in response`);
      throw new CustomError("No media data found. Post may be private or deleted.", 404);
    }

    console.log(`✅ Media data extracted successfully`);
    console.log(`   Type: ${items.__typename}`);
    console.log(`   Is Video: ${items.is_video}`);
    console.log(`   Owner: ${items.owner?.username}`);

    // Return comprehensive data structure
    return {
      success: true,
      data: {
        __typename: items?.__typename,
        shortcode: items?.shortcode,
        id: items?.id,
        dimensions: items?.dimensions,
        display_url: items?.display_url,
        display_resources: items?.display_resources,
        has_audio: items?.has_audio,
        video_url: items?.video_url,
        video_view_count: items?.video_view_count,
        video_play_count: items?.video_play_count,
        is_video: items?.is_video,
        caption: items?.edge_media_to_caption?.edges[0]?.node?.text,
        is_paid_partnership: items?.is_paid_partnership,
        location: items?.location,
        owner: {
          id: items?.owner?.id,
          username: items?.owner?.username,
          full_name: items?.owner?.full_name,
          profile_pic_url: items?.owner?.profile_pic_url,
          is_verified: items?.owner?.is_verified,
          is_private: items?.owner?.is_private,
          follower_count: items?.owner?.edge_followed_by?.count,
          following_count: items?.owner?.edge_follow?.count,
          post_count: items?.owner?.edge_owner_to_timeline_media?.count
        },
        product_type: items?.product_type,
        video_duration: items?.video_duration,
        thumbnail_src: items?.thumbnail_src,
        thumbnail_resources: items?.thumbnail_resources,
        clips_music_attribution_info: items?.clips_music_attribution_info,
        sidecar: items?.edge_sidecar_to_children?.edges?.map(edge => ({
          __typename: edge.node.__typename,
          id: edge.node.id,
          shortcode: edge.node.shortcode,
          dimensions: edge.node.dimensions,
          display_url: edge.node.display_url,
          display_resources: edge.node.display_resources,
          is_video: edge.node.is_video,
          video_url: edge.node.video_url,
          has_audio: edge.node.has_audio,
          video_duration: edge.node.video_duration,
          thumbnail_src: edge.node.thumbnail_src
        })),
        like_count: items?.edge_media_preview_like?.count,
        comment_count: items?.edge_media_to_comment?.count,
        taken_at_timestamp: items?.taken_at_timestamp,
        accessibility_caption: items?.accessibility_caption
      }
    };

  } catch (error) {
    console.error('❌ Instagram GraphQL API Error:', error.message);
    
    if (error instanceof CustomError) {
      throw error;
    }
    
    throw new CustomError(`Failed to fetch Instagram data: ${error.message}`, 500);
  }
};

// Main endpoint - get video URL (maintains backward compatibility)
const getVideoUrl = async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({
      success: false,
      error: "URL parameter is required"
    });
  }

  try {
    console.log(`🔍 Extracting Instagram media from: ${url}`);
    
    const result = await getInstagramGraphqlData(url);
    
    if (!result.success) {
      throw new CustomError("Failed to extract media data", 500);
    }

    const data = result.data;
    
    // For backward compatibility, return just the video URL if it's a video
    if (data.is_video && data.video_url) {
      console.log(`✅ Video URL extracted successfully`);
      return res.json({
        success: true,
        videoUrl: data.video_url
      });
    }
    
    // For images or carousel, return the display URL
    if (data.display_url) {
      console.log(`✅ Image URL extracted successfully`);
      return res.json({
        success: true,
        videoUrl: data.display_url, // Using videoUrl for backward compatibility
        imageUrl: data.display_url,
        isVideo: false
      });
    }
    
    throw new CustomError("No media URL found in the post", 404);

  } catch (error) {
    console.error('❌ Instagram extraction error:', error.message);
    
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      error: "Failed to extract media URL: " + error.message
    });
  }
};

// New endpoint - get full media data
const getMediaData = async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({
      success: false,
      error: "URL parameter is required"
    });
  }

  try {
    console.log(`🔍 Extracting full Instagram media data from: ${url}`);
    
    const result = await getInstagramGraphqlData(url);
    
    return res.json(result);

  } catch (error) {
    console.error('❌ Instagram media data extraction error:', error.message);
    
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      error: "Failed to extract media data: " + error.message
    });
  }
};

// Helper endpoint - get post info only
const getPostInfo = async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({
      success: false,
      error: "URL parameter is required"
    });
  }

  try {
    console.log(`🔍 Extracting Instagram post info from: ${url}`);
    
    const result = await getInstagramGraphqlData(url);
    
    if (!result.success) {
      throw new CustomError("Failed to extract post data", 500);
    }

    const data = result.data;
    
    // Return only basic post information
    const postInfo = {
      success: true,
      data: {
        shortcode: data.shortcode,
        id: data.id,
        caption: data.caption,
        is_video: data.is_video,
        has_audio: data.has_audio,
        dimensions: data.dimensions,
        owner: data.owner,
        like_count: data.like_count,
        comment_count: data.comment_count,
        taken_at_timestamp: data.taken_at_timestamp,
        product_type: data.product_type,
        video_duration: data.video_duration,
        is_paid_partnership: data.is_paid_partnership,
        location: data.location,
        clips_music_attribution_info: data.clips_music_attribution_info
      }
    };
    
    return res.json(postInfo);

  } catch (error) {
    console.error('❌ Instagram post info extraction error:', error.message);
    
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      error: "Failed to extract post info: " + error.message
    });
  }
};

module.exports = {
  getVideoUrl,
  getMediaData,
  getPostInfo
}; 