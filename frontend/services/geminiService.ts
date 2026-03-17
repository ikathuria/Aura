export const generatePersona = async (): Promise<string> => {
  throw new Error('Client-side persona generation is disabled. Use Firebase Functions.');
};

export const generateStoryScript = async (): Promise<string> => {
  throw new Error('Client-side script generation is disabled. Use cached assets or Functions.');
};

export const generateCinematicVideo = async (): Promise<null> => {
  throw new Error('Client-side video generation is disabled. Use cached assets or Functions.');
};
