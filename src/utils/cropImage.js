
export const getCroppedImg = (imageSrc, pixelCrop, outputWidth, outputHeight) => {
  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  return new Promise((resolve, reject) => {
    createImage(imageSrc)
      .then((image) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        const fallbackCrop = {
          x: 0,
          y: 0,
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
        };

        const crop = pixelCrop || fallbackCrop;

        const scaleX = (image.naturalWidth || image.width) / (image.width || 1);
        const scaleY = (image.naturalHeight || image.height) / (image.height || 1);

        const sx = crop.x * scaleX;
        const sy = crop.y * scaleY;
        const sWidth = crop.width * scaleX;
        const sHeight = crop.height * scaleY;

        const targetWidth = outputWidth || crop.width;
        const targetHeight = outputHeight || crop.height;

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        ctx.drawImage(
          image,
          sx,
          sy,
          sWidth,
          sHeight,
          0,
          0,
          targetWidth,
          targetHeight
        );

        canvas.toBlob(
          (file) => {
            if (!file) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }
            resolve(file);
          },
          'image/jpeg',
          0.9
        );
      })
      .catch(reject);
  });
};
