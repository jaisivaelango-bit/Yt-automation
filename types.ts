
export type TabType = 'chat' | 'images' | 'video' | 'settings';

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export type ImageSize = '1K' | '2K' | '4K';
export type AspectRatio = '16:9' | '9:16';

export interface GeneratedAsset {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
}
