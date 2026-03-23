export const isValidDate = (d) => {
    if (!d || d.length !== 10) return false;
    try {
        const [day, month, year] = d.split('/').map(Number);
        if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) return false;
        const date = new Date(year, month - 1, day);
        return date.getDate() === day && date.getMonth() === month - 1 && date.getFullYear() === year;
    } catch {
        return false;
    }
};
