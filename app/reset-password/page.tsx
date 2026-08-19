"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { TrendingUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

const formSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const invalidLink = searchParams.get("error") === "INVALID_TOKEN";
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "" },
  });

  async function onSubmit(values: FormValues) {
    if (!token) return;
    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });
    if (error) {
      toast.error(error.message ?? "Couldn't reset your password — the link may have expired");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground mb-2">
            <TrendingUp className="size-5" />
          </span>
          <CardTitle className="text-xl">Set a new password</CardTitle>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="size-8 text-emerald-600 mx-auto" />
              <p className="text-sm text-muted-foreground">Password updated — signing you in.</p>
            </div>
          ) : !token || invalidLink ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                This reset link is invalid or has expired.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/forgot-password">Request a new link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="password">New password</FieldLabel>
                  <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
                  <FieldError errors={[errors.password]} />
                </Field>
              </FieldGroup>
              <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
                Update password
              </Button>
            </form>
          )}
          <p className="text-sm text-muted-foreground text-center mt-4">
            <Link href="/login" className="text-foreground underline underline-offset-2">
              Back to sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
