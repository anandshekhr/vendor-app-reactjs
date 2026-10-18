import auth from '@react-native-firebase/auth';

class FirebaseAuthServiceClass {
  private confirmationResult: any = null;

  async sendOTP(phoneNumber: string): Promise<any> {
    const formattedNumber = phoneNumber.startsWith('+91')
      ? phoneNumber
      : `+91${phoneNumber}`;

    this.confirmationResult = await auth().signInWithPhoneNumber(formattedNumber);
    return this.confirmationResult;
  }

  async verifyOTP(otp: string): Promise<string> {
    if (!this.confirmationResult) {
      throw new Error('OTP was not sent. Please request a new OTP.');
    }

    const credential = await this.confirmationResult.confirm(otp);
    const idToken = await credential.user.getIdToken();
    return idToken;
  }

  async getCurrentUser() {
    return auth().currentUser;
  }

  async getIdToken(): Promise<string | null> {
    const user = auth().currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  }

  async signOut(): Promise<void> {
    await auth().signOut();
  }
}

export const FirebaseAuthService = new FirebaseAuthServiceClass();
