
export const getCroppedImg = (imageSrc, pixelCrop, outputWidth, outputHeight) => {
  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues on CodeSandbox
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

        const rawCrop = pixelCrop || {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        };

        const cropX = Math.max(0, Math.min(Math.round(rawCrop.x), image.width - 1));
        const cropY = Math.max(0, Math.min(Math.round(rawCrop.y), image.height - 1));
        const cropWidth = Math.max(
          1,
          Math.min(Math.round(rawCrop.width), image.width - cropX)
        );
        const cropHeight = Math.max(
          1,
          Math.min(Math.round(rawCrop.height), image.height - cropY)
        );

        if (outputWidth && outputHeight) {
          canvas.width = outputWidth;
          canvas.height = outputHeight;
          ctx.drawImage(
            image,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            outputWidth,
            outputHeight
          );
        } else {
          canvas.width = image.width;
          canvas.height = image.height;
          ctx.drawImage(image, 0, 0);
          const data = ctx.getImageData(cropX, cropY, cropWidth, cropHeight);
          canvas.width = cropWidth;
          canvas.height = cropHeight;
          ctx.putImageData(data, 0, 0);
        }
        canvas.toBlob((file) => {
          resolve(file);
        }, 'image/jpeg');
      })
      .catch(reject);
  });
};
