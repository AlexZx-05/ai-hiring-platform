import SignInForm from "@/components/auth/SignInForm";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const isAuthCallback = Boolean(params.code || params.state || params.error);

  return <SignInForm isAuthCallback={isAuthCallback} />;
}
