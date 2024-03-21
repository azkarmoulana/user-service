import { autoInjectable } from "tsyringe";
import { plainToClass } from "class-transformer";
import { APIGatewayProxyEventV2 } from "aws-lambda";

import { UserRepository } from "../repository/ userRepository";
import { SuccessReaponse, ErrorResponse } from "../utility/response";
import { SignupInput } from "../models/dto/SignupInput";
import { LoginInput } from "../models/dto/LoginInput";
import { VerificationInput } from "../models/dto/UpdateInput";
import { AppValidationError } from "../utility/errors";
import {
  GetSalt,
  GetHashedPassword,
  ValidatePassword,
  GetToken,
  VerifyAuthToken,
} from "../utility/password";
import {
  GenereateVerificationCode,
  SendVerificationCode,
} from "../utility/notification";
import { TimeDifference } from "../utility/dateHelper";
import { ProfileInput } from "../models/dto/AddressInput";

@autoInjectable()
export class UserService {
  repository: UserRepository;

  constructor(repository: UserRepository) {
    this.repository = repository;
  }

  // User signup, login & verify
  async CreateUser(event: APIGatewayProxyEventV2) {
    try {
      const body = JSON.parse(event.body);
      const input = plainToClass(SignupInput, body);
      const error = await AppValidationError(input);
      if (error) return ErrorResponse(404, error);

      const salt = await GetSalt();
      const hashedPassword = await GetHashedPassword(input.password, salt);
      const data = await this.repository.createAccount({
        email: input.email,
        password: hashedPassword,
        phone: input.phone,
        userType: "BUYER",
        salt,
      });

      return SuccessReaponse(data);
    } catch (error) {
      console.log(error);
      return ErrorResponse(500, error);
    }
  }

  async LoginUser(event: APIGatewayProxyEventV2) {
    try {
      const body = JSON.parse(event.body);
      const input = plainToClass(LoginInput, body);
      const error = await AppValidationError(input);
      if (error) return ErrorResponse(404, error);

      const data = await this.repository.findAccount(input.email);

      // check or validate password
      const verified = await ValidatePassword(
        input.password,
        data.password,
        data.salt
      );

      if (!verified) {
        return ErrorResponse(504, "Invalid user credentials!");
      }

      const token = GetToken(data);
      return SuccessReaponse({ token });
    } catch (error) {
      console.log(error);
      return ErrorResponse(500, error);
    }
  }

  async GetVerificationCode(event: APIGatewayProxyEventV2) {
    const token = event.headers.authorization;
    const payload = await VerifyAuthToken(token);

    if (!payload) return ErrorResponse(403, "authorization failed!");

    const { code, expiry } = GenereateVerificationCode();
    /*
     * save on DB to confirm verification
     **/
    await this.repository.updateVerificationCode(payload.user_id, code, expiry);

    console.log(code, expiry);
    // const response = await SendVerificationCode(code, payload.phone);
    return SuccessReaponse({
      message: "verification code is sent to your registered phone number!",
    });
  }

  async VerifyUser(event: APIGatewayProxyEventV2) {
    const token = event.headers.authorization;
    const payload = await VerifyAuthToken(token);

    if (!payload) return ErrorResponse(403, "authorization failed!");

    const body = JSON.parse(event.body);
    const input = plainToClass(VerificationInput, body);
    const error = await AppValidationError(input);
    if (error) return ErrorResponse(404, error);

    const { verification_code, expiry } = await this.repository.findAccount(
      payload.email
    );

    if (verification_code === parseInt(input.code)) {
      const currentTime = new Date();
      const diff = TimeDifference(expiry, currentTime.toISOString(), "m");

      if (diff > 0) {
        await this.repository.updateUserVerify(payload.user_id);
      } else {
        return ErrorResponse(403, "verification code is expired!");
      }
    } else {
      return ErrorResponse(403, "user verification failed");
    }

    return SuccessReaponse({ message: "user verified!" });
  }

  // User profile
  async CreateProfile(event: APIGatewayProxyEventV2) {
    try {
      const token = event.headers.authorization;
      const payload = await VerifyAuthToken(token);

      if (!payload) return ErrorResponse(403, "authorization failed!");

      const body = JSON.parse(event.body);
      const input = plainToClass(ProfileInput, body);
      const error = await AppValidationError(input);
      if (error) return ErrorResponse(404, error);

      await this.repository.createProfile(payload.user_id, input);

      return SuccessReaponse({ message: "profile created successfully!" });
    } catch (error) {
      return ErrorResponse(500, error);
    }
  }

  async GetProfile(event: APIGatewayProxyEventV2) {
    try {
      const token = event.headers.authorization;
      const payload = await VerifyAuthToken(token);
      if (!payload) return ErrorResponse(403, "authorization failed!");

      const result = await this.repository.getUserProfile(payload.user_id);

      return SuccessReaponse(result);
    } catch (error) {
      return ErrorResponse(500, error);
    }
  }

  async EdiProfile(event: APIGatewayProxyEventV2) {
    try {
      const token = event.headers.authorization;
      const payload = await VerifyAuthToken(token);

      if (!payload) return ErrorResponse(403, "authorization failed!");

      const body = JSON.parse(event.body);
      const input = plainToClass(ProfileInput, body);
      const error = await AppValidationError(input);
      if (error) return ErrorResponse(404, error);

      await this.repository.editProfile(payload.user_id, input);

      return SuccessReaponse({ message: "profile updated successfully!" });
    } catch (error) {
      return ErrorResponse(500, error);
    }
  }

  // Cart section
  async CreateCart(event: APIGatewayProxyEventV2) {
    return SuccessReaponse({ message: "response from create cart" });
  }

  async GetCart(event: APIGatewayProxyEventV2) {
    return SuccessReaponse({ message: "response from get cart" });
  }

  async UpdateCart(event: APIGatewayProxyEventV2) {
    return SuccessReaponse({ message: "response from update cart" });
  }

  // Payment section
  async CreatePaymentMethod(event: APIGatewayProxyEventV2) {
    return SuccessReaponse({ message: "response from create payment method" });
  }

  async GetPaymentMethod(event: APIGatewayProxyEventV2) {
    return SuccessReaponse({ message: "response from get payment method" });
  }

  async UpdatePaymentMethod(event: APIGatewayProxyEventV2) {
    return SuccessReaponse({ message: "response from update payment method" });
  }
}
