# AWS Rekognition Infrastructure Snippets

## Terraform (HCL)

```hcl
resource "aws_kms_key" "selfie_kms" {
  description         = "KMS key for verification media"
  deletion_window_in_days = 30
  key_usage           = "ENCRYPT_DECRYPT"
  customer_master_key_spec = "SYMMETRIC_DEFAULT"
}

resource "aws_s3_bucket" "verification" {
  bucket = var.verification_bucket_name
  force_destroy = false

  lifecycle_rule {
    id      = "expire-temp"
    enabled = true

    prefix = "temp/verification/"

    expiration {
      days = 1
    }
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = aws_kms_key.selfie_kms.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "verification" {
  bucket                  = aws_s3_bucket.verification.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_iam_role" "verification_service" {
  name               = "verification-service-role"
  assume_role_policy = data.aws_iam_policy_document.verification_trust.json
}

data "aws_iam_policy_document" "verification_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "verification_permissions" {
  statement {
    effect    = "Allow"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.verification.arn}/temp/verification/*"]
  }

  statement {
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.verification.arn]
  }

  statement {
    effect    = "Allow"
    actions   = ["rekognition:CompareFaces"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "aws:RequestedRegion"
      values   = ["eu-central-1"]
    }
  }

  statement {
    effect    = "Allow"
    actions   = ["kms:Decrypt", "kms:Encrypt", "kms:GenerateDataKey"]
    resources = [aws_kms_key.selfie_kms.arn]
  }
}

resource "aws_iam_policy" "verification" {
  name   = "verification-service"
  policy = data.aws_iam_policy_document.verification_permissions.json
}

resource "aws_iam_role_policy_attachment" "verification" {
  role       = aws_iam_role.verification_service.name
  policy_arn = aws_iam_policy.verification.arn
}
```

## AWS CDK (TypeScript)

```ts
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kms from "aws-cdk-lib/aws-kms";
import * as iam from "aws-cdk-lib/aws-iam";

export class VerificationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const kmsKey = new kms.Key(this, "SelfieKms", {
      enableKeyRotation: true,
      description: "KMS key for verification media",
    });

    const bucket = new s3.Bucket(this, "VerificationBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: kmsKey,
      enforceSSL: true,
      lifecycleRules: [
        {
          id: "expire-temp",
          prefix: "temp/verification/",
          expiration: cdk.Duration.hours(1),
        },
      ],
    });

    const role = new iam.Role(this, "VerificationServiceRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    bucket.grantReadWrite(role, "temp/verification/*");
    kmsKey.grantEncryptDecrypt(role);

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["rekognition:CompareFaces"],
        resources: ["*"],
        conditions: {
          "StringEquals": {
            "aws:RequestedRegion": "eu-central-1",
          },
        },
      })
    );
  }
}
```

> These snippets assume deployment in `eu-central-1`. Restrict credentials and networking (VPC endpoints) accordingly to keep all media and API calls within the EU boundary.
