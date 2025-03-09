// import { State, Action, StateContext, Selector } from '@ngxs/store';
// import { Injectable } from '@angular/core';

// import { AuthStateModel, IUser } from '../../models/auth.state.model';
// import { GetMe, Login } from '../actions/auth.actions';

// @State<AuthStateModel>({
//   name: 'auth',
//   defaults: {
//     isAuthenticated: false,
//     accessToken: '',
//     refreshToken: '',
//     me: {
//       id: '',
//       name: '',
//       email: '',
//       is_email_verified: false,
//       is_phone_verified: false,
//       is_active: false,
//       password: '',
//       role: '',
//       created_at: '',
//       updated_at: '',
//     },
//   },
// })
// @Injectable()
// export class AuthState {
//   constructor() {}

//   @Selector()
//   static getMe(state: AuthStateModel): IUser {
//     return state.me;
//   }

//   @Action(GetMe)
//   getMe(ctx: StateContext<AuthStateModel>, action: GetMe) {
//     ctx.patchState({
//       me: action.me,
//     });
//   }

//   @Action(Login)
//   login(ctx: StateContext<AuthStateModel>, action: Login) {
//     const state = ctx.getState();
//     ctx.setState({
//       ...state,
//       isAuthenticated: true,
//       accessToken: action.payload.access_token,
//       refreshToken: action.payload.refresh_token,
//     });
//   }
// }
