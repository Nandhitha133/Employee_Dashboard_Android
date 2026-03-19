// src/services/navigationService.ts
import { createRef } from 'react';
import { CommonActions } from '@react-navigation/native';

export const navigationRef = createRef<any>();

export function navigate(name: string, params?: any) {
  navigationRef.current?.navigate(name, params);
}

export function resetAndNavigate(name: string) {
  navigationRef.current?.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name }],
    })
  );
}