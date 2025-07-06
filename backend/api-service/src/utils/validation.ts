// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Password validation - at least 8 chars, uppercase, lowercase, number, special char
export function validatePassword(password: string): boolean {
  if (password.length < 8) {
    return false;
  }

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
}

// Name validation - at least 2 characters, only letters and spaces
export function validateName(name: string): boolean {
  if (name.length < 2) {
    return false;
  }

  const nameRegex = /^[a-zA-ZÀ-ÿ\s]+$/;
  return nameRegex.test(name.trim());
}

// Trading experience validation
export function validateTradingExperience(experience: string): boolean {
  const validExperiences = ['beginner', 'intermediate', 'advanced', 'expert'];
  return validExperiences.includes(experience);
}

// Risk tolerance validation
export function validateRiskTolerance(riskTolerance: string): boolean {
  const validRiskLevels = ['low', 'medium', 'high'];
  return validRiskLevels.includes(riskTolerance);
}

// Markets validation
export function validateMarkets(markets: string[]): boolean {
  const validMarkets = ['forex', 'stocks', 'crypto', 'commodities', 'indices'];
  return markets.every(market => validMarkets.includes(market));
}