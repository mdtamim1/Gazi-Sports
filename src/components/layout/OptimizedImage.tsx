import React, { useState } from 'react';
import { getOptimizedImageUrl } from '../../utils/imageCdn';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  style,
  containerClassName = '',
  containerStyle,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Generate low-res placeholder (20x20px width)
  const blurPlaceholder = getOptimizedImageUrl(src, 20, 20);

  // Generate main optimized CDN URL
  const optimizedSrc = getOptimizedImageUrl(src, width, height);

  return (
    <div
      className={containerClassName}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'inline-block',
        width: style?.width || '100%',
        height: style?.height || '100%',
        ...containerStyle
      }}
    >
      {/* Blurred Low-Res Placeholder */}
      {!isLoaded && blurPlaceholder && (
        <img
          src={blurPlaceholder}
          alt={alt}
          style={{
            filter: 'blur(10px)',
            transform: 'scale(1.05)',
            width: '100%',
            height: '100%',
            objectFit: style?.objectFit || 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            transition: 'opacity 0.3s ease-out',
            zIndex: 1,
            ...style
          }}
        />
      )}

      {/* Main High-Res Optimized Image */}
      <img
        src={optimizedSrc}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          objectFit: style?.objectFit || 'cover',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.4s ease-in-out',
          position: isLoaded ? 'relative' : 'absolute',
          zIndex: 2,
          ...style
        }}
        {...props}
      />
    </div>
  );
};
