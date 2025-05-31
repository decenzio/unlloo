import React, { useState } from "react";

interface CryptoIconProps {
  symbol: string;
  color: string;
  imageUrl?: string;
  size?: number;
}

export const CryptoIcon: React.FC<CryptoIconProps> = ({ symbol, color, imageUrl, size = 28 }) => {
  const [imageError, setImageError] = useState(false);

  if (imageUrl && !imageError) {
    return (
      <img
        src={imageUrl}
        alt={symbol}
        className={`rounded-full`}
        style={{ width: size, height: size }}
        onError={() => setImageError(true)}
      />
    );
  }

  // Fallback to text-based icon
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold text-xs"
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        fontSize: size * 0.4,
      }}
    >
      {symbol.slice(0, 3)}
    </div>
  );
};
