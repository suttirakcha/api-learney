import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { TypedConfigService } from 'src/config/typed-config.service';
import { MailController } from 'src/mail/mail.controller';
import { MailService } from 'src/mail/mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [TypedConfigService],
      useFactory: (typedConfigService: TypedConfigService) => {
        const host = typedConfigService.get('MAIL_HOST');
        const user = typedConfigService.get('MAIL_USER');
        const password = typedConfigService.get('MAIL_PASSWORD');

        if (!host) {
          return {
            transport: { jsonTransport: true },
            defaults: {
              from: typedConfigService.get('MAIL_FROM'),
            },
          };
        }

        return {
          transport: {
            host,
            port: typedConfigService.get('MAIL_PORT'),
            secure: typedConfigService.get('MAIL_SECURE'),
            auth:
              user && password
                ? {
                    user,
                    pass: password,
                  }
                : undefined,
          },
          defaults: {
            from: typedConfigService.get('MAIL_FROM'),
          },
        };
      },
    }),
  ],
  providers: [MailService],
  controllers: [MailController],
  exports: [MailService],
})
export class MailModule {}
