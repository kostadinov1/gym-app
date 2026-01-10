type LogoutListener = () => void;

let logoutListeners: LogoutListener[] = [];

export const authEvents = {
  subscribe: (listener: LogoutListener) => {
    logoutListeners.push(listener);
    return () => {
      logoutListeners = logoutListeners.filter((l) => l !== listener);
    };
  },
  emitLogout: () => {
    logoutListeners.forEach((listener) => listener());
  },
};