import { registerDecorator, type ValidationOptions } from 'class-validator';
import { isPrmPassword, PRM_PASSWORD_MESSAGE } from './password-policy';

export function IsPrmPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPrmPassword',
      target: object.constructor,
      propertyName,
      options: {
        message: PRM_PASSWORD_MESSAGE,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          return isPrmPassword(value);
        },
        defaultMessage() {
          return PRM_PASSWORD_MESSAGE;
        },
      },
    });
  };
}
