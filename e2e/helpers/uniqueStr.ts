  export function generateCode(length: number) {
        let result = '';
        const characters = '0123456789';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
          counter += 1;
        }
        return result;
    }

    export function generateUserName(length: number) {
      let result = '';
      const characters = '0123456789';
      const charactersLength = characters.length;
      let counter = 0;
      while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
      }
      result = 'test'+result;
      return result;
  }

  export function uniqueStr(s: string) {
    const now = new Date().getTime();
    return `${s}${now}`;
  }