import { api } from "@/services/api";

export async function login(email: string, password: string) {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

export async function signup(name: string, email: string, password: string) {
  const { data } = await api.post("/auth/signup", { name, email, password });
  return data;
}
