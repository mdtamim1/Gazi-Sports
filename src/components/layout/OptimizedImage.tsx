import React, { useState } from 'react';
import { getOptimizedImageUrl } from '../../utils/imageCdn';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  style,
  containerClassName = '',
  containerStyle,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Generate main optimized URL
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
        background: isLoaded ? 'transparent' : 'var(--sf-bg-light, #f3f4f6)',
        ...containerStyle
      }}
    >
      <img
        src={optimizedSrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => setIsLoaded(true)}
        className={className}
        style={{
          width: '100%',
          height: '100%',
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out',
          display: 'block',
          ...style
        }}
        {...props}
      />
    </div>
  );
};
