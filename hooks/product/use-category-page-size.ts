import { useEffect, useState } from "react";

function computeCategoryPageSize(width: number): number {
  if (width < 768) return 4;
  if (width < 1024) return 6;
  return 10;
}

export function useCategoryPageSize() {
  const [categoryPageSize, setCategoryPageSize] = useState<number>(10);

  useEffect(() => {
    const onResize = () => {
      setCategoryPageSize(computeCategoryPageSize(window.innerWidth));
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return categoryPageSize;
}
