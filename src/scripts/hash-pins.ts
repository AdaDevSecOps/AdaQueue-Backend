import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UserService } from '../modules/user/user.service';
import { User } from '../modules/user/entities/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));

  const users = await userRepo.find();
  console.log(`Found ${users.length} users to process.`);

  for (const user of users) {
    if (user.pin && user.pin.length === 4) {
      console.log(`Hashing PIN for user: ${user.code} (${user.name})`);
      const salt = await bcrypt.genSalt(10);
      const hashedPin = await bcrypt.hash(user.pin, salt);
      await userRepo.update(user.code, { pin: hashedPin });
    } else {
      console.log(`Skipping user: ${user.code} (PIN already hashed or invalid)`);
    }
  }

  console.log('PIN hashing completed.');
  await app.close();
}

bootstrap();
