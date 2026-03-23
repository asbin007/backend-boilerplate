const checkOtpExpiration = (otpGeneratedTime: string, thresholdTime: number): boolean => {
  const currentTime = Date.now();
  return currentTime - parseInt(otpGeneratedTime) <= thresholdTime;
};

export default checkOtpExpiration;

