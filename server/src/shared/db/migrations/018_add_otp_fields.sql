ALTER TABLE "users" ADD COLUMN "otp_code" varchar(10);
ALTER TABLE "users" ADD COLUMN "otp_expires" timestamp with time zone;
