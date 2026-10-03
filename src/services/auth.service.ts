import { apiBase, readApiResponse } from './api';
import type { User } from '../types/app';

export async function loginUser(rollNumber: string, pin: string): Promise<{ token: string; user: User }> {
  const response = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rollNumber, pin }),
  });
  return readApiResponse<{ token: string; user: User }>(response);
}

export async function requestPinReset(rollNumber: string, email: string): Promise<{ message: string }> {
  const response = await fetch(`${apiBase}/api/auth/reset-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rollNumber, email }),
  });
  return readApiResponse<{ message: string }>(response);
}

export async function changeUserPin(
  currentPin: string,
  newPin: string,
  token: string,
): Promise<{ message: string }> {
  const response = await fetch(`${apiBase}/api/auth/change-pin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ currentPin, newPin }),
  });
  return readApiResponse<{ message: string }>(response);
}
