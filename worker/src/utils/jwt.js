// src/utils/jwt.js - JWT utilities
import { SignJWT, jwtVerify } from 'jose';

export class JWT {
  static async sign(payload, secret, expiresIn = '24h') {
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(new TextEncoder().encode(secret));
    
    return jwt;
  }

  static async verify(token, secret) {
    try {
      const { payload } = await jwtVerify(
        token, 
        new TextEncoder().encode(secret)
      );
      return payload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}