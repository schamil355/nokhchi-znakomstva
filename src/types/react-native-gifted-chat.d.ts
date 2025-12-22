declare module "react-native-gifted-chat" {
  // Minimal surface to satisfy TS in app code; underlying lib is JS/ESM.
  export const GiftedChat: any;
  export const Bubble: any;
  export const InputToolbar: any;
  export const Send: any;
  export const Composer: any;
  export type GiftedChatProps = Record<string, any>;
  export interface IMessage {
    _id: string;
    text: string;
    createdAt: Date | string | number;
    readAt?: Date | string | null;
    user: { _id: string; name?: string | null };
    [key: string]: any;
  }
}
