import {
	createMutation,
	createQuery,
	keepPreviousData,
	useQueryClient
} from '@tanstack/svelte-query';
import type {
	ChangePasswordInput,
	CreateUserInput,
	UpdateUserInput,
	UserListParams
} from '../model';
import { usersRepository } from './repository';

export const usersQueryKeys = {
	all: ['users'] as const,
	lists: () => [...usersQueryKeys.all, 'list'] as const,
	list: (params: UserListParams) => [...usersQueryKeys.lists(), params] as const
};

export function createUsersQuery(params: () => UserListParams) {
	return createQuery(() => {
		const value = params();

		return {
			queryKey: usersQueryKeys.list(value),
			queryFn: () => usersRepository.list(value),
			placeholderData: keepPreviousData
		};
	});
}

export function createCreateUserMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: (input: CreateUserInput) => usersRepository.create(input),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: usersQueryKeys.lists() })
	}));
}

export function createUpdateUserMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: ({ userId, input }: { userId: string; input: UpdateUserInput }) =>
			usersRepository.updateById(userId, input),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: usersQueryKeys.lists() })
	}));
}

export function createToggleUserStatusMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
			usersRepository.updateStatus(userId, isActive),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: usersQueryKeys.lists() })
	}));
}

export function createDeleteUserMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: (userId: string) => usersRepository.deleteById(userId),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: usersQueryKeys.lists() })
	}));
}

export function createUpdateCurrentUserMutation() {
	const queryClient = useQueryClient();

	return createMutation(() => ({
		mutationFn: (input: UpdateUserInput) => usersRepository.updateCurrentUser(input),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: usersQueryKeys.all })
	}));
}

export function createChangeCurrentPasswordMutation() {
	return createMutation(() => ({
		mutationFn: (input: ChangePasswordInput) => usersRepository.changeCurrentPassword(input)
	}));
}
