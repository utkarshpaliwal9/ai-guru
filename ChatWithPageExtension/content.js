console.log('Content script loaded.');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PAGE_CONTENT') {
    console.log('Content script: Received GET_PAGE_CONTENT for question:', request.question);
    
    // Extract text content
    let content = '';
    const mainElement = document.querySelector('main');
    if (mainElement) {
      content = mainElement.innerText;
    } else {
      content = document.body.innerText; // Fallback to entire body
    }

    if (!content || content.trim() === '') {
        // Try to get text from article, div[role="main"], etc.
        const articleElement = document.querySelector('article');
        if(articleElement) content = articleElement.innerText;
        else {
            const roleMain = document.querySelector('div[role="main"]');
            if(roleMain) content = roleMain.innerText;
        }
    }

    // Extract images from the page
    console.log('Content script: Starting image extraction...');
    const imgElements = document.querySelectorAll('img');
    console.log(`Content script: Found ${imgElements.length} img elements on page`);
    
    let processedImages = 0;
    const maxImages = 10; // Increased limit
    
    const processImage = (img, index) => {
      return new Promise((resolve) => {
        console.log(`Processing image ${index + 1}: src=${img.src}, width=${img.width}, height=${img.height}`);
        
        // Skip very small images (likely icons/decorative) but be less restrictive
        if (img.width < 30 || img.height < 30) {
          console.log(`Skipping image ${index + 1}: too small (${img.width}x${img.height})`);
          resolve(null);
          return;
        }
        
        // Skip images without src
        if (!img.src) {
          console.log(`Skipping image ${index + 1}: no src`);
          resolve(null);
          return;
        }
        
        // Handle data URLs directly
        if (img.src.startsWith('data:')) {
          console.log(`Using data URL directly for image ${index + 1}`);
          resolve({
            src: img.src,
            alt: img.alt || '',
            base64: img.src
          });
          return;
        }
        
        // Create a canvas to convert image to base64
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Create a new image element to ensure it's loaded
        const tempImg = new Image();
        
        // Set crossOrigin BEFORE setting src to handle CORS
        tempImg.crossOrigin = 'anonymous';
        
        // Set a timeout to avoid hanging
        const timeout = setTimeout(() => {
          console.warn(`Timeout loading image ${index + 1}: ${img.src}`);
          resolve(null);
        }, 5000);
        
        tempImg.onload = () => {
          clearTimeout(timeout);
          console.log(`Successfully loaded image ${index + 1}: ${tempImg.width}x${tempImg.height}`);
          
          // Resize large images to reduce data size
          const maxDimension = 800;
          let { width, height } = tempImg;
          
          if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width *= ratio;
            height *= ratio;
            console.log(`Resizing image ${index + 1} to ${Math.round(width)}x${Math.round(height)}`);
          }
          
          canvas.width = width;
          canvas.height = height;
          
          try {
            ctx.drawImage(tempImg, 0, 0, width, height);
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            console.log(`Successfully converted image ${index + 1} to base64 (${base64.length} chars)`);
            resolve({
              src: img.src,
              alt: img.alt || '',
              base64: base64
            });
          } catch (error) {
            clearTimeout(timeout);
            console.warn(`CORS error converting image ${index + 1} to base64:`, error.message);
            
            // Try alternative approach: use the original image src
            // This won't work for vision API but at least we can count images
            resolve({
              src: img.src,
              alt: img.alt || '',
              base64: null, // No base64 due to CORS
              corsError: true
            });
          }
        };
        
        tempImg.onerror = () => {
          clearTimeout(timeout);
          console.warn(`Failed to load image ${index + 1}:`, img.src);
          
          // Try without CORS for counting purposes
          resolve({
            src: img.src,
            alt: img.alt || '',
            base64: null,
            loadError: true
          });
        };
        
        // Load the image
        tempImg.src = img.src;
      });
    };
    
    // Process images in parallel but limit the number
    const imagePromises = Array.from(imgElements)
      .slice(0, maxImages)
      .map((img, index) => processImage(img, index));
    
    console.log(`Content script: Processing ${imagePromises.length} images...`);
    
    Promise.all(imagePromises).then(imageResults => {
      const allImages = imageResults.filter(img => img !== null);
      const validImages = allImages.filter(img => img.base64 !== null);
      const corsImages = allImages.filter(img => img.corsError);
      const errorImages = allImages.filter(img => img.loadError);
      
      console.log(`Content script: Image processing summary:`);
      console.log(`- Total img elements found: ${imgElements.length}`);
      console.log(`- Images processed (any result): ${allImages.length}`);
      console.log(`- Images with base64 data: ${validImages.length}`);
      console.log(`- Images blocked by CORS: ${corsImages.length}`);
      console.log(`- Images with load errors: ${errorImages.length}`);
      
      if (validImages.length > 0) {
        console.log('Content script: Successfully processed images:', validImages.map(img => ({ src: img.src.substring(0, 50) + '...', alt: img.alt })));
      }
      if (corsImages.length > 0) {
        console.log('Content script: CORS-blocked images:', corsImages.map(img => ({ src: img.src.substring(0, 50) + '...', alt: img.alt })));
      }
      
      console.log('Content script: Extracted content snippet:', content.substring(0, 200) + "...");
      
      sendResponse({ 
        content: content,
        images: validImages, // Only send images with base64 data to API
        imageCount: validImages.length,
        totalImagesFound: imgElements.length,
        totalImagesProcessed: allImages.length,
        corsBlockedImages: corsImages.length,
        imageDetails: {
          processed: allImages.length,
          withBase64: validImages.length,
          corsBlocked: corsImages.length,
          loadErrors: errorImages.length
        }
      });
    }).catch(error => {
      console.error('Error processing images:', error);
      // Send response with just text content if image processing fails
      sendResponse({ 
        content: content,
        images: [],
        imageCount: 0,
        totalImagesFound: imgElements.length,
        error: error.message
      });
    });
    
    return true; // Keep the message channel open for asynchronous response
  }
}); 