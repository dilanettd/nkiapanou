import { IUser } from '../../models/auth.state.model';

export class Login {
  static readonly type = '[Auth] Login';
  constructor(
    public payload: {
      access_token: string;
      refresh_token: string;
      role: string;
    }
  ) {}
}

export class RefreshToken {
  static readonly type = '[Auth] Refresh Token';

  constructor(
    public payload: { access_token: string; refresh_token: string }
  ) {}
}

export class GetMe {
  static readonly type = '[Auth] GetMe';

  constructor(public me: IUser) {}
}

export class UpdateMe {
  static readonly type = '[Auth] UpdateMe';

  constructor(public updateMe: any) {}
}

export class Logout {
  static readonly type = '[Auth] Logout';
}
