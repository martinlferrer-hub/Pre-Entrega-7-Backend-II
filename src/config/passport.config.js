import passport from "passport";
import { Strategy as CustomStrategy } from "passport-custom";
import { Strategy as LocalStrategy } from "passport-local";

import { usersRepository } from "../repositories/users.repository.js";
import { hashPassword, comparePassword } from "../utils/hash.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

const createAuthError = (message, status = 400) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

passport.use(
  "register",
  new CustomStrategy(async (req, done) => {
    try {
      const { first_name, last_name, email, password } = req.body ?? {};

      if (!first_name || !last_name || !email || !password) {
        return done(createAuthError("Faltan campos obligatorios", 400));
      }

      if (
        typeof first_name !== "string" ||
        typeof last_name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string"
      ) {
        return done(
          createAuthError("Los campos enviados no tienen un formato válido", 400)
        );
      }

      const normalizedFirstName = first_name.trim();
      const normalizedLastName = last_name.trim();
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedFirstName || !normalizedLastName) {
        return done(createAuthError("Faltan campos obligatorios", 400));
      }

      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return done(createAuthError("El email no tiene un formato válido", 400));
      }

      if (password.length < MIN_PASSWORD_LENGTH) {
        return done(
          createAuthError(
            `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
            400
          )
        );
      }

      const existingUser = await usersRepository.findByEmail(normalizedEmail);

      if (existingUser) {
        return done(createAuthError("El email ya está registrado", 409));
      }

      const hashedPassword = await hashPassword(password);

      const user = await usersRepository.create({
        first_name: normalizedFirstName,
        last_name: normalizedLastName,
        email: normalizedEmail,
        password: hashedPassword,
        role: "user"
      });

      return done(null, {
        id: user._id.toString(),
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role
      });
    } catch (error) {
      if (error.code === 11000) {
        return done(createAuthError("El email ya está registrado", 409));
      }

      return done(error);
    }
  })
);

passport.use(
  "login",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      session: false
    },
    async (email, password, done) => {
      try {
        if (
          typeof email !== "string" ||
          typeof password !== "string" ||
          !email.trim() ||
          !password
        ) {
          return done(createAuthError("Credenciales inválidas", 401));
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await usersRepository.findByEmail(normalizedEmail);

        if (!user) {
          return done(createAuthError("Credenciales inválidas", 401));
        }

        const passwordMatches = await comparePassword(password, user.password);

        if (!passwordMatches) {
          return done(createAuthError("Credenciales inválidas", 401));
        }

        return done(null, {
          id: user._id.toString(),
          email: user.email,
          role: user.role
        });
      } catch (error) {
        return done(error);
      }
    }
  )
);



export default passport;
