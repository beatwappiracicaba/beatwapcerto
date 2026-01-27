
export const getCroppedImg = (imageSrc, pixelCrop) => {
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
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        const data = ctx.getImageData(
          pixelCrop.x,
          pixelCrop.y,
          pixelCrop.width,
          pixelCrop.height
        );
        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;
        ctx.putImageData(data, 0, 0);
        canvas.toBlob((file) => {
          resolve(file);
        }, 'image/jpeg');
      })
      .catch(reject);
  });
};
