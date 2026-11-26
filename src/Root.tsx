import React from 'react';
import {Composition} from 'remotion';
import {CandiShorts} from './CandiShorts';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="CandiShorts"
      component={CandiShorts}
      durationInFrames={813}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
