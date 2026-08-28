type ShowModalFn = (onAllow: () => void, onDeny: () => void) => void;

export const registerLocationModalHandler = (_fn: ShowModalFn) => {
  // Android-only foreground service permission flow.
};

class ForegroundService {
  static start = async () => {
    console.log('ForegroundService is Android-only; skipping start on iOS');
  };

  static stop = async () => {
    console.log('ForegroundService is Android-only; skipping stop on iOS');
  };
}

export default ForegroundService;
