import * as React from 'react';

type SheetSize = {width: number; height: number};

export const useSheetScale = ({width, height}: SheetSize) => {
  const [viewport, setViewport] = React.useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  React.useEffect(() => {
    const updateViewport = () => setViewport({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  return Math.min(viewport.width / width, viewport.height / height);
};
