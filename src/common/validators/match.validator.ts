import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'Match', async: false })
export class Match implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments): boolean {
    const [propertyName] = args.constraints as [string];

    const obj = args.object as Record<string, unknown>;
    const relatedValue = obj[propertyName];

    return value === (relatedValue as string);
  }

  defaultMessage(): string {
    return 'Passwords do not match';
  }
}
