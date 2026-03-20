// src/types/declarations.d.ts

declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg';

// React Navigation types
declare module '@react-navigation/native' {
  export const useNavigation: any;
  export const NavigationContainer: any;
  export const useFocusEffect: any;
  export const useRoute: any;
  export const useIsFocused: any;
}

// Async Storage
declare module '@react-native-async-storage/async-storage' {
  export default class AsyncStorage {
    static getItem(key: string): Promise<string | null>;
    static setItem(key: string, value: string): Promise<void>;
    static removeItem(key: string): Promise<void>;
    static multiRemove(keys: string[]): Promise<void>;
    static clear(): Promise<void>;
  }
}

// Picker
declare module '@react-native-picker/picker' {
  import { Component, ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export interface PickerProps extends ViewProps {
    selectedValue?: any;
    onValueChange?: (itemValue: any, itemIndex: number) => void;
    enabled?: boolean;
    mode?: 'dialog' | 'dropdown';
    prompt?: string;
    style?: any;
    itemStyle?: any;
    dropdownIconColor?: string;
    children?: React.ReactNode;
  }

  export class Picker extends Component<PickerProps> {
    static Item: ComponentType<{ label: string; value: any; color?: string }>;
  }
}

// NetInfo
declare module '@react-native-community/netinfo' {
  export interface NetInfoState {
    type: string;
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    details: any;
  }

  export default class NetInfo {
    static fetch(): Promise<NetInfoState>;
    static addEventListener(listener: (state: NetInfoState) => void): () => void;
  }
}

// Document Picker
declare module 'react-native-document-picker' {
  export interface DocumentPickerResponse {
    uri: string;
    name: string;
    type: string;
    size: number;
  }

  export const types: {
    allFiles: string;
    audio: string;
    images: string;
    pdf: string;
    plainText: string;
    video: string;
  };

  export function pick(options: {
    type?: string | string[];
    mode?: 'import' | 'open';
    allowMultiSelection?: boolean;
  }): Promise<DocumentPickerResponse[]>;

  export function isCancel(error: any): boolean;
}

declare module 'react-native-confetti' {
  import { Component } from 'react';
  export default class Confetti extends Component<any> {
    startConfetti(): void;
    stopConfetti(): void;
  }
}
